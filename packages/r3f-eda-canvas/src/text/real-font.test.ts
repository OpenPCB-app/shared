import { expect, test } from "bun:test";
import { coversCodePoint, displayText, validateCoverage, validateFont, type GlyphCoverage } from "./font-validation.js";

const fixture = new URL("../../tests/fixtures/NotoSans-Regular.ttf", import.meta.url);
const manifest = await Bun.file(new URL("../../tests/fixtures/manifest.json", import.meta.url)).json() as {
  sha256: string;
  coverage: GlyphCoverage;
  replacement: string;
  coverageCount: number;
};

test("licensed real font matches immutable production pin and validates every declared glyph", async () => {
  const bytes = await Bun.file(fixture).arrayBuffer();
  expect(new Bun.CryptoHasher("sha256").update(bytes).digest("hex")).toBe("b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5");
  expect(manifest.sha256).toBe("b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5");
  validateCoverage(manifest.coverage, manifest.replacement);
  expect(() => validateFont(bytes, manifest.coverage)).not.toThrow();
  expect(manifest.coverage.reduce((sum, [first, last]) => sum + last - first + 1, 0)).toBe(manifest.coverageCount);
});

test("real EDA Unicode samples covered; CJK explicitly degraded without domain mutation", () => {
  const sample = "R1\n10 kΩ ω µ μ Резистор Конденсатор";
  expect(displayText(sample, manifest.coverage, manifest.replacement)).toEqual({ text: sample, missing: [], unrenderable: false });
  expect(coversCodePoint(manifest.coverage, 0x4e2d)).toBe(false);
  expect(displayText("R1 中文", manifest.coverage, manifest.replacement)).toEqual({ text: "R1 ??", missing: [0x4e2d, 0x6587], unrenderable: false });
});
