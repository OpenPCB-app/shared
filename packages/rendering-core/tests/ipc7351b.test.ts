/**
 * IPC-7351B footprint generator — sanity assertions on dimensions and pad
 * counts. Guards against silent regressions in the geometry math.
 */
import { describe, expect, test } from "bun:test";
import {
  generateFootprint,
  ALL_FAMILIES,
  getFamilyById,
  type DensityLevel,
} from "../src/index.js";

const DENSITIES: DensityLevel[] = ["most", "nominal", "least"];

describe("IPC-7351B generator", () => {
  test("ALL_FAMILIES contains every supported family", () => {
    const ids = ALL_FAMILIES.map((f) => f.id);
    expect(ids).toContain("chip");
    expect(ids).toContain("sot");
    expect(ids).toContain("soic");
    expect(ids).toContain("qfp");
    expect(ids).toContain("qfn");
  });

  test("every family preset resolves by id", () => {
    for (const family of ALL_FAMILIES) {
      const resolved = getFamilyById(family.id);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(family.id);
    }
  });

  test("CHIP 0201 nominal produces a valid 2-pad model", () => {
    const result = generateFootprint("chip", "0201", "nominal");
    expect(result.source.pads).toHaveLength(2);
    expect(result.model.bounds).toBeDefined();
    expect(result.metadata.mountType).toBe("smd");
    // 2-terminal symmetric: pads mirror about origin
    const [p1, p2] = result.source.pads;
    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    if (!p1 || !p2) return;
    expect(p1.centerMm.x).toBeCloseTo(-p2.centerMm.x, 6);
  });

  test("SOIC-8 nominal produces 8 numbered pads", () => {
    const result = generateFootprint("soic", "SOIC-8", "nominal");
    expect(result.source.pads.length).toBe(8);
    const numbers = result.source.pads.map((p) => p.number).sort();
    expect(numbers).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  test("TQFP-32 nominal produces 32 pads spread across four sides", () => {
    const result = generateFootprint("qfp", "TQFP-32", "nominal");
    expect(result.source.pads).toHaveLength(32);
    const pads = result.source.pads;
    // Sanity: pads spread on left + right (large |x|) and top + bottom (large |y|)
    const horiz = pads.filter(
      (p) => Math.abs(p.centerMm.x) > Math.abs(p.centerMm.y),
    );
    const vert = pads.filter(
      (p) => Math.abs(p.centerMm.y) > Math.abs(p.centerMm.x),
    );
    expect(horiz.length).toBeGreaterThan(0);
    expect(vert.length).toBeGreaterThan(0);
    expect(horiz.length + vert.length).toBe(32);
  });

  test("density tiers (most/nominal/least) produce monotonic pad sizes", () => {
    const sizes = DENSITIES.map((d) => {
      const r = generateFootprint("soic", "SOIC-8", d);
      const pad = r.source.pads[0];
      expect(pad).toBeDefined();
      return pad?.widthMm ?? 0;
    });
    // most ≥ nominal ≥ least
    expect(sizes[0]!).toBeGreaterThanOrEqual(sizes[1]!);
    expect(sizes[1]!).toBeGreaterThanOrEqual(sizes[2]!);
  });

  test("generated footprints round-trip through buildFootprintRenderModel", () => {
    const result = generateFootprint("soic", "SOIC-8", "nominal");
    expect(result.model.pads.length).toBe(result.source.pads.length);
    expect(result.model.warnings).toEqual([]);
  });
});
