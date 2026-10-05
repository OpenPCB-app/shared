import { mock } from "bun:test";
let preloads = 0;
mock.module("troika-three-text", () => ({ preloadFont: () => { preloads++; } }));
mock.module("@react-three/drei", () => ({ Text: () => null }));
mock.module("@react-three/fiber", () => ({ useThree: () => ({ invalidate: () => {} }) }));
Object.defineProperty(globalThis, "self", { configurable: true, value: globalThis });
await import("../src/primitives/EDAText.js");
console.log(JSON.stringify({ preloads }));
