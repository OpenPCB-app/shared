import { describe, expect, it } from "bun:test";
import {
  AI_PROVIDER_PRESETS,
  getPresetByKind,
  listPresets,
} from "../src/providers/presets.js";

describe("provider presets", () => {
  it("exposes all 4 kinds", () => {
    const kinds = AI_PROVIDER_PRESETS.map((p) => p.kind).sort();
    expect(kinds).toEqual(["lmstudio", "omlx", "openai", "openai-compatible"]);
  });

  it("openai requires API key", () => {
    expect(getPresetByKind("openai")?.requiresApiKey).toBe(true);
  });

  it("lmstudio and omlx do not require API key", () => {
    expect(getPresetByKind("lmstudio")?.requiresApiKey).toBe(false);
    expect(getPresetByKind("omlx")?.requiresApiKey).toBe(false);
  });

  it("omlx has empty defaults but provides probe URLs", () => {
    const omlx = getPresetByKind("omlx");
    expect(omlx?.defaultBaseUrl).toBe("");
    expect(omlx?.defaultModel).toBe("");
    expect(omlx?.probeBaseUrls?.length ?? 0).toBeGreaterThan(0);
  });

  it("listPresets returns a copy", () => {
    const a = listPresets();
    const b = listPresets();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
