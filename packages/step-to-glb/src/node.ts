import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import initOcctImportJs from "occt-import-js";
import { getCategoryMaterial } from "./category-materials.js";
import type {
  ConversionResult,
  Model3DRef,
  TessellationParams,
} from "./step-to-glb.js";

const GLB_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

interface OcctImportJsModule {
  ReadStepFile(content: Uint8Array, params: TessellationParams | null): OcctReadStepResult;
}

interface OcctNode {
  name?: string;
  meshes?: number[];
  children?: OcctNode[];
}

interface OcctMesh {
  name?: string;
  color?: [number, number, number];
  brep_faces?: Array<{
    first: number;
    last: number;
    color: [number, number, number] | null;
  }>;
  attributes: {
    position: { array: ArrayLike<number> };
    normal?: { array: ArrayLike<number> };
  };
  index: { array: ArrayLike<number> };
}

interface OcctReadStepResult {
  success: boolean;
  error?: string;
  root?: OcctNode;
  meshes?: OcctMesh[];
}

class NodeFileReader {
  result: ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
}

function ensureFileReader(): void {
  const globalRecord = globalThis as unknown as { FileReader?: unknown };
  globalRecord.FileReader ??= NodeFileReader;
}

function errorResult(code: string, message: string): ConversionResult {
  return { status: "error", code, message };
}

function buildGeometry(mesh: OcctMesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.name = mesh.name ?? "STEP mesh";
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(Array.from(mesh.attributes.position.array), 3),
  );
  if (mesh.attributes.normal) {
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(Array.from(mesh.attributes.normal.array), 3),
    );
  } else {
    geometry.computeVertexNormals();
  }
  geometry.setIndex(
    new THREE.BufferAttribute(Uint32Array.from(Array.from(mesh.index.array)), 1),
  );
  return geometry;
}

function buildMaterial(mesh: OcctMesh): THREE.MeshLambertMaterial | THREE.MeshLambertMaterial[] {
  const fallback = getCategoryMaterial(null, []);
  if (mesh.color) fallback.color = new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]);
  if (!mesh.brep_faces?.length) return fallback;

  const materials = [fallback];
  for (const face of mesh.brep_faces) {
    const material = fallback.clone();
    if (face.color) material.color = new THREE.Color(face.color[0], face.color[1], face.color[2]);
    materials.push(material);
  }
  return materials;
}

function addFaceGroups(geometry: THREE.BufferGeometry, mesh: OcctMesh): void {
  if (!mesh.brep_faces?.length) return;
  const triangleCount = mesh.index.array.length / 3;
  let triangleIndex = 0;
  let faceIndex = 0;
  while (triangleIndex < triangleCount) {
    const firstIndex = triangleIndex;
    let lastIndex = triangleCount;
    let materialIndex = 0;
    const face = mesh.brep_faces[faceIndex];
    if (face && triangleIndex < face.first) {
      lastIndex = face.first;
    } else if (face) {
      lastIndex = face.last + 1;
      materialIndex = faceIndex + 1;
      faceIndex += 1;
    }
    geometry.addGroup(firstIndex * 3, (lastIndex - firstIndex) * 3, materialIndex);
    triangleIndex = lastIndex;
  }
}

function buildMesh(mesh: OcctMesh): THREE.Mesh {
  const geometry = buildGeometry(mesh);
  addFaceGroups(geometry, mesh);
  const threeMesh = new THREE.Mesh(geometry, buildMaterial(mesh));
  threeMesh.name = mesh.name ?? "STEP mesh";
  return threeMesh;
}

function buildGroupFromNode(node: OcctNode, meshes: OcctMesh[]): THREE.Group {
  const group = new THREE.Group();
  group.name = node.name ?? "STEP node";
  for (const meshIndex of node.meshes ?? []) {
    const mesh = meshes[meshIndex];
    if (mesh) group.add(buildMesh(mesh));
  }
  for (const child of node.children ?? []) group.add(buildGroupFromNode(child, meshes));
  return group;
}

function buildGroup(result: OcctReadStepResult): THREE.Group {
  const meshes = result.meshes ?? [];
  if (result.root) return buildGroupFromNode(result.root, meshes);
  const group = new THREE.Group();
  group.name = "STEP model";
  for (const mesh of meshes) group.add(buildMesh(mesh));
  return group;
}

function correctUpAxisIfNeeded(group: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(group);
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) return;
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.x === 0 || size.y === 0 || size.z === 0) return;
  if (size.z <= size.x && size.z <= size.y) return;

  const correction = new THREE.Matrix4();
  if (size.y <= size.x && size.y <= size.z) correction.makeRotationX(Math.PI / 2);
  else correction.makeRotationY(-Math.PI / 2);

  group.updateMatrix();
  correction.multiply(group.matrix).decompose(group.position, group.quaternion, group.scale);
}

function applyModelRefTransform(group: THREE.Group, modelRef: Model3DRef | null | undefined): void {
  if (!modelRef) return;
  const offset = new THREE.Vector3(modelRef.offset.x, modelRef.offset.y, modelRef.offset.z);
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(modelRef.rotation.x),
      THREE.MathUtils.degToRad(modelRef.rotation.y),
      THREE.MathUtils.degToRad(modelRef.rotation.z),
      "XYZ",
    ),
  );
  const scale = new THREE.Vector3(modelRef.scale.x, modelRef.scale.y, modelRef.scale.z);
  const transform = new THREE.Matrix4().compose(offset, quaternion, scale);
  group.updateMatrix();
  transform.clone().multiply(group.matrix).decompose(group.position, group.quaternion, group.scale);
}

async function exportGlb(group: THREE.Group): Promise<ArrayBuffer> {
  ensureFileReader();
  const exporter = new GLTFExporter();
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const message = String(args[0] ?? "");
    if (message.includes("GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial")) {
      return;
    }
    originalWarn(...args);
  };
  const result = await exporter
    .parseAsync(group, { binary: true })
    .finally(() => {
      console.warn = originalWarn;
    });
  if (!(result instanceof ArrayBuffer)) {
    throw new Error("GLTFExporter returned JSON output instead of binary GLB");
  }
  return result;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

export async function convertStepToGlbNode(
  stepBytes: ArrayBuffer,
  params: TessellationParams = {},
  modelRef?: Model3DRef | null,
): Promise<ConversionResult> {
  const occt = (await initOcctImportJs()) as OcctImportJsModule;
  const result = occt.ReadStepFile(new Uint8Array(stepBytes), params ?? null);
  if (!result.success) {
    return errorResult("occt_read_failed", result.error ?? "OCCT could not read the STEP file");
  }

  const group = buildGroup(result);
  correctUpAxisIfNeeded(group);
  applyModelRefTransform(group, modelRef);
  const glbBytes = await exportGlb(group);
  if (glbBytes.byteLength > GLB_SIZE_LIMIT_BYTES) {
    return errorResult(
      "glb_too_large",
      `Converted GLB is ${glbBytes.byteLength} bytes, exceeding ${GLB_SIZE_LIMIT_BYTES} bytes`,
    );
  }
  return { status: "ok", glbBytes, sha256: await sha256(glbBytes) };
}
