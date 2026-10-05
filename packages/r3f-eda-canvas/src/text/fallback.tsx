import { useMemo } from "react";
import type { EDATextProps } from "../primitives/EDAText.js";

export function fallbackBounds(text: string, fontSize: number, maxWidth = 0): [number, number] {
  const lines = text.split(/\r\n|\r|\n/);
  const naturalWidth = Math.max(1, ...lines.map((line) => Array.from(line).length)) * fontSize * 0.6;
  const width = maxWidth > 0 ? Math.min(naturalWidth, maxWidth) : naturalWidth;
  const rows = maxWidth > 0 ? Math.max(lines.length, Math.ceil(naturalWidth / maxWidth)) : lines.length;
  return [width, Math.max(1, rows) * fontSize * 1.2];
}

export function TextFallback(props: EDATextProps & { text: string }) {
  const { text, fontSize = 250_000, maxWidth, anchorX = "left", anchorY = "middle" } = props;
  const positions = useMemo(() => {
    const [width, height] = fallbackBounds(text, fontSize, maxWidth);
    const x = anchorX === "left" ? 0 : anchorX === "center" ? -width / 2 : -width;
    const y = anchorY === "top" ? -height : anchorY === "middle" ? -height / 2 :
      anchorY === "top-baseline" ? -height + fontSize * 0.8 : anchorY === "bottom-baseline" ? -fontSize * 0.2 : 0;
    const a = [x, y, 0], b = [x + width, y, 0], c = [x + width, y + height, 0], d = [x, y + height, 0];
    return new Float32Array([...a, ...b, ...b, ...c, ...c, ...d, ...d, ...a, ...a, ...c, ...b, ...d]);
  }, [text, fontSize, maxWidth, anchorX, anchorY]);
  return (
    <lineSegments renderOrder={props.renderOrder}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <lineBasicMaterial color={props.color} depthTest={props.depthTest ?? false} depthWrite={false}
        transparent opacity={props.opacity ?? 1} />
    </lineSegments>
  );
}
