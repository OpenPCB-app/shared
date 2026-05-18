import { describe, expect, test } from "bun:test";
import { canonicalize } from "../src/pack/canonicalize.js";

describe("canonicalize", () => {
  test("sorts object keys at every depth", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalize({ b: { d: 1, c: 2 }, a: 1 })).toBe(
      '{"a":1,"b":{"c":2,"d":1}}',
    );
  });

  test("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalize([{ b: 1, a: 2 }, { c: 3 }])).toBe(
      '[{"a":2,"b":1},{"c":3}]',
    );
  });

  test("drops undefined and function-valued keys", () => {
    const obj: Record<string, unknown> = {
      a: 1,
      b: undefined,
      c: () => 0,
      d: Symbol("x"),
      e: 2,
    };
    expect(canonicalize(obj)).toBe('{"a":1,"e":2}');
  });

  test("undefined inside arrays becomes null", () => {
    expect(canonicalize([1, undefined, 2])).toBe("[1,null,2]");
  });

  test("handles primitives", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize('a"b')).toBe('"a\\"b"');
  });

  test("byte-deterministic regardless of construction order", () => {
    const a = { z: 1, a: 2, m: { n: 3, b: 4 } };
    const b = { m: { b: 4, n: 3 }, a: 2, z: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  test("matches the documented compact form", () => {
    expect(
      canonicalize({
        schemaVersion: "1.0.0",
        library: { id: "openpcb.core", channel: "stable" },
        symbols: [],
      }),
    ).toBe(
      '{"library":{"channel":"stable","id":"openpcb.core"},"schemaVersion":"1.0.0","symbols":[]}',
    );
  });
});
