import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { buildFootprintRenderModel } from "@openpcb/rendering-core";
import { FootprintRenderLayer, CanvasThemeProvider, configureEdaText, RENDER_ORDER } from "eda-canvas-under-test";
import type { Material, Object3D, WebGLRenderer } from "three";
import manifest from "../fixtures/manifest.json";

const parameters = new URL(location.href).searchParams;
const mode = parameters.get("mode") ?? "default";
const variant = parameters.get("variant") ?? "source";
const model = buildFootprintRenderModel({ name: "H05-depth-two-pad-silk", warnings: [],
  pads: [-4, 4].map((x, index) => ({ id: `pad-${index}`, number: String(index + 1), shape: "rect" as const,
    centerMm: { x, y: 0 }, widthMm: 0.7, heightMm: 1.2, rotationDeg: 0, layer: "F.Cu" })),
  graphics: [{ kind: "rect", x: -4.7, y: -1, width: 9.4, height: 2, fill: "none", strokeWidthMm: 0.1, layer: "F.SilkS" }],
  labels: ["R1 Ω µ μ", "Ω ω µ μ"].map((text, index) => ({ id: `silk-${index}`, text, at: { x: 0, y: index ? -2 : 0 },
    fontSizeMm: 0.8, rotationDeg: 0, anchorX: "center" as const, anchorY: "middle" as const, layer: "F.SilkS", role: index ? "value" as const : "reference" as const })),
});
configureEdaText({ fontUrl: "/font.ttf", fontSha256: manifest.sha256, replacement: manifest.replacement,
  coverage: manifest.coverage.map(([first, last]) => [first!, last!] as const), timeoutMs: 2000 });

interface TextData { text: string; font: string; glyphCount: number; blockBounds: number[]; depthTest: boolean; depthWrite: boolean; position: number[] }
function textData(object: Object3D): TextData | null {
  if (!("textRenderInfo" in object)) return null;
  const text = object as unknown as { text: string; font: string; material: Material;
    textRenderInfo?: { glyphBounds: Float32Array; blockBounds: number[] }; _isSyncing?: boolean; _needsSync?: boolean };
  // Troika geometry arrives before the React onSync commit removes the pending marker.
  if (!text.textRenderInfo || text._isSyncing || text._needsSync || object.parent?.children.some((child) => child.type === "LineSegments")) return null;
  return { text: text.text, font: text.font, glyphCount: text.textRenderInfo.glyphBounds.length / 4,
    blockBounds: [...text.textRenderInfo.blockBounds], depthTest: text.material.depthTest, depthWrite: text.material.depthWrite,
    position: [object.matrixWorld.elements[12]!, object.matrixWorld.elements[13]!, object.matrixWorld.elements[14]!] };
}

function brightPixels(renderer: WebGLRenderer, centerY: number): number {
  const context = renderer.getContext();
  const pixels = new Uint8Array(420 * 105 * 4);
  context.readPixels(190, Math.round(centerY - 52), 420, 105, context.RGBA, context.UNSIGNED_BYTE, pixels);
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i]! > 180 && pixels[i + 1]! > 180 && pixels[i + 2]! > 180) count++;
  return count;
}

function Capture() {
  const { scene, gl, invalidate } = useThree();
  useEffect(() => {
    let pending = false, stopped = false, frame = 0, previous = "", stableFrames = 0;
    const labels = (): TextData[] => {
      const result: TextData[] = [];
      scene.traverse((object) => { const label = textData(object); if (label) result.push(label); });
      return result.sort((first, second) => first.text.localeCompare(second.text));
    };
    const timer = setInterval(() => {
      if (pending || labels().length !== model.labels.length) return;
      pending = true; invalidate();
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => {
        pending = false;
        if (stopped) return;
        const renderedLabels = labels();
        if (renderedLabels.length !== model.labels.length) { stableFrames = 0; return; }
        const pixels = { coveredLabel: brightPixels(gl, 200), uncoveredGreek: brightPixels(gl, 60) };
        const key = JSON.stringify({ labels: renderedLabels, pixels });
        stableFrames = key === previous ? stableFrames + 1 : 1; previous = key;
        if (stableFrames < 3) return;
        clearInterval(timer);
        const result = { variant, mode, model: { kind: model.kind, units: model.units, bounds: model.bounds, pads: model.pads.length },
          labels: renderedLabels, pixels, readiness: { synced: true, pendingMarkers: 0, stableFrames }, complete: true };
        Object.assign(window, { footprintDepth: result });
        document.querySelector("pre")!.textContent = JSON.stringify(result, null, 2);
      }); });
    }, 20);
    return () => { stopped = true; clearInterval(timer); cancelAnimationFrame(frame); };
  }, [scene, gl, invalidate]);
  return null;
}

const depth = mode === "default" ? {} : { enableDepthTest: mode === "occluded" };
createRoot(document.querySelector("#root")!).render(<CanvasThemeProvider mode="dark">
  <Canvas orthographic dpr={1} frameloop="demand" gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 0, 10], zoom: 70 }}>
    <color attach="background" args={["#111827"]} />
    <mesh name="depth-occluder" position={[0, 0, 0.8]} renderOrder={RENDER_ORDER.BODIES}><boxGeometry args={[7, 1.8, 0.6]} />
      <meshBasicMaterial color="#b91c1c" depthTest depthWrite /></mesh>
    <FootprintRenderLayer model={model} surface="pcb" hidePadNumbers {...depth} />
    <Capture />
  </Canvas>
</CanvasThemeProvider>);
