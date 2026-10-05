import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { EDAText } from "../../src/primitives/EDAText.js";
import { configureEdaText, type EdaTextStatus } from "../../src/text/runtime.js";
import manifest from "../fixtures/manifest.json";

const mode = new URL(location.href).searchParams.get("mode") ?? "healthy";
const samples = ["R1\n10 kΩ ω µ μ", "Резистор Конденсатор", "R1 中文", "\nR2"];
const statuses: Record<number, EdaTextStatus> = {};
const renderInfo: { text: string; glyphCount: number; blockBounds: number[]; font: string }[] = [];
if (mode !== "unconfigured") configureEdaText({ fontUrl: `/font.ttf?mode=${mode}`, fontSha256: manifest.sha256,
  coverage: manifest.coverage.map(([first, last]) => [first!, last!] as const), replacement: manifest.replacement, timeoutMs: 2000 });

function Capture() {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const timer = setInterval(() => {
      renderInfo.length = 0;
      scene.traverse((object) => {
        if (!("textRenderInfo" in object)) return;
        const textObject = object as unknown as { text: string; font: string; textRenderInfo?: { glyphBounds: Float32Array; blockBounds: number[] } };
        if (!textObject.textRenderInfo) return;
        renderInfo.push({ text: textObject.text, font: textObject.font,
          glyphCount: textObject.textRenderInfo.glyphBounds.length / 4, blockBounds: [...textObject.textRenderInfo.blockBounds] });
      });
      const complete = Object.keys(statuses).length === samples.length && Object.values(statuses).every((status) => status.state !== "pending");
      Object.assign(window, { fontFixture: { mode, statuses, renderInfo, originals: samples, complete } });
      document.querySelector("pre")!.textContent = JSON.stringify({ mode, statuses, renderInfo }, null, 2);
      if (complete) { clearInterval(timer); invalidate(); }
    }, 20);
    return () => clearInterval(timer);
  }, [scene, invalidate]);
  return null;
}

createRoot(document.querySelector("#root")!).render(
  <Canvas orthographic frameloop="demand" camera={{ position: [0, 0, 10], zoom: 55 }}>
    <color attach="background" args={["#111827"]} />
    <mesh position={[-3, 2.1, 0]}><boxGeometry args={[1, 0.5, 0.05]} /><meshBasicMaterial color="#ef4444" depthTest={false} depthWrite={false} /></mesh>
    {samples.map((text, index) => <EDAText key={text} position={[-4, 1 - index * 1.3, 0]} fontSize={0.45} color="#e2e8f0"
      onTextStatus={(status) => { statuses[index] = status; }}>{text}</EDAText>)}
    <Capture />
  </Canvas>,
);
