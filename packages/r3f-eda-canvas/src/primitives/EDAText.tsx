import { Text } from "@react-three/drei";
import { preloadFont } from "troika-three-text";
import type { ReactNode } from "react";
import { RENDER_ORDER } from "../layers.js";

// Eagerly preload the default Troika font in browser contexts so drei's
// <Text> suspend() call finds a cached result on first render. Vitest's node
// environment has no `self`, and troika reads it at preload time.
if (typeof self !== "undefined") {
  preloadFont(
    {
      characters:
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-+/()[]{}#~:;,!?@$%^&*=<>_ Ωωµμ",
    } as unknown as Parameters<typeof preloadFont>[0],
    () => {},
  );
}

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
  /**
   * When true, the text material participates in depth testing so 3D geometry
   * in front of it (component bodies, pads) occludes it. Default false keeps
   * the 2D canvas always-on-top convention (coplanar, renderOrder-layered).
   * depthWrite stays permanently false — a transparent SDF quad must never
   * write depth for its anti-aliased margins.
   */
  depthTest?: boolean;
}

const DEFAULT_FONT_SIZE = 250_000;

export function EDAText({
  position,
  children,
  fontSize = DEFAULT_FONT_SIZE,
  color = "#e2e8f0",
  anchorX = "left",
  anchorY = "middle",
  rotation,
  maxWidth = 0,
  opacity = 1,
  renderOrder = RENDER_ORDER.LABELS,
  visible = true,
  outlineWidth,
  outlineColor,
  depthTest = false,
}: EDATextProps) {
  if (!visible) return null;

  return (
    <Text
      position={position}
      fontSize={fontSize}
      color={color}
      anchorX={anchorX}
      anchorY={anchorY}
      rotation={rotation}
      maxWidth={maxWidth || undefined}
      renderOrder={renderOrder}
      material-depthTest={depthTest}
      material-depthWrite={false}
      material-transparent={true}
      material-opacity={opacity}
      outlineWidth={outlineWidth}
      outlineColor={outlineColor}
    >
      {children}
    </Text>
  );
}
