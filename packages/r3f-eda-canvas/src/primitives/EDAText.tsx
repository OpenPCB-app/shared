import { Text } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Children, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { RENDER_ORDER } from "../layers.js";
import { TextFallback } from "../text/fallback.js";
import { LabelBoundary } from "../text/label-boundary.js";
import { getEdaTextRuntime, subscribeEdaText, type EdaTextStatus, type FontSnapshot } from "../text/runtime.js";

export interface EDATextProps {
  position: [number, number, number];
  children: ReactNode;
  fontSize?: number;
  color?: string;
  anchorX?: "left" | "center" | "right";
  anchorY?: "top" | "middle" | "bottom" | "top-baseline" | "bottom-baseline";
  rotation?: [number, number, number];
  maxWidth?: number;
  opacity?: number;
  renderOrder?: number;
  visible?: boolean;
  outlineWidth?: number;
  outlineColor?: string;
  /** Depth testing lets 3D geometry occlude labels. Transparent text never writes depth. */
  depthTest?: boolean;
  /** Reports local degradation; original domain text is never changed. */
  onTextStatus?: (status: EdaTextStatus) => void;
}

const IDLE: FontSnapshot = { state: "idle" };
const noSubscribe = (): (() => void) => () => {};
const idleSnapshot = (): FontSnapshot => IDLE;

function childText(children: ReactNode): string {
  let text = "";
  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") text += child;
  });
  return text;
}

function FontFailure({ status, fallback, onStatus }: { status: EdaTextStatus; fallback: ReactNode; onStatus?: (status: EdaTextStatus) => void }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => { invalidate(); onStatus?.(status); }, [invalidate, onStatus, status]);
  return fallback;
}

export function EDAText({ fontSize = 250_000, color = "#e2e8f0", anchorX = "left", anchorY = "middle",
  maxWidth = 0, opacity = 1, renderOrder = RENDER_ORDER.LABELS, visible = true, depthTest = false, ...props }: EDATextProps) {
  const runtime = useSyncExternalStore(subscribeEdaText, getEdaTextRuntime, getEdaTextRuntime);
  const font = useSyncExternalStore(runtime?.subscribe ?? noSubscribe, runtime?.getSnapshot ?? idleSnapshot, idleSnapshot);
  const text = useMemo(() => childText(props.children), [props.children]);
  const display = useMemo(() => runtime?.text(text), [runtime, text]);
  const hasText = text.length > 0;
  useEffect(() => { if (runtime && visible && hasText) return runtime.acquire(); }, [runtime, visible, hasText]);
  const status = useMemo<EdaTextStatus>(() => {
    if (!runtime) return { state: "fallback", reason: "unconfigured" };
    if (font.state === "failed") return { state: "fallback", reason: "font-error", error: font.error };
    if (display?.unrenderable) return { state: "fallback", reason: "missing-glyph", missingCodePoints: display.missing };
    return { state: "pending" };
  }, [runtime, font, display]);
  if (!visible || !text) return null;
  const defaults = { fontSize, color, anchorX, anchorY, maxWidth, opacity, renderOrder, depthTest };
  const fallback = <TextFallback {...props} {...defaults} text={text} />;
  return (
    <group position={props.position} rotation={props.rotation} visible={visible}>
      {font.state !== "ready" || !runtime || !display || display.unrenderable ?
        <FontFailure status={status} fallback={fallback} onStatus={props.onTextStatus} /> :
        <LabelBoundary key={JSON.stringify([font.fontUrl, display.text, fontSize, maxWidth, anchorX, anchorY])} timeoutMs={runtime.configuration.timeoutMs ?? 5000}
          missingCodePoints={display.missing} fallback={fallback} onStatus={props.onTextStatus}
          renderText={(onSync) => <Text fontSize={fontSize} color={color} anchorX={anchorX} anchorY={anchorY} renderOrder={renderOrder} font={font.fontUrl}
            characters={Array.from(new Set(Array.from(display.text).filter((character) => !["\n", "\r", "\t"].includes(character)))).join("")}
            maxWidth={maxWidth || undefined} material-depthTest={depthTest} material-depthWrite={false}
            material-transparent material-opacity={opacity} outlineWidth={props.outlineWidth}
            outlineColor={props.outlineColor} onSync={onSync}>{display.text}</Text>} />}
    </group>
  );
}
