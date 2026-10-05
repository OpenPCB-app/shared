import { describe, expect, test } from "bun:test";
import { EdaFontRuntime, configureEdaText, disposeEdaText, getEdaTextRuntime, localFontUrl, type FontEnvironment } from "./runtime.js";
import { displayText, validateFont } from "./font-validation.js";

function fixture(format: 4 | 12 = 12): ArrayBuffer {
  const tables: [string, number][] = [["head", 54], ["maxp", 6], ["hhea", 36], ["hmtx", 16], ["glyf", 1], ["loca", 10], ["cmap", format === 12 ? 40 : 44]];
  const buffer = new ArrayBuffer(12 + tables.length * 16 + tables.reduce((sum, [, size]) => sum + size, 0));
  const view = new DataView(buffer);
  view.setUint32(0, 0x00010000); view.setUint16(4, tables.length);
  let offset = 12 + tables.length * 16;
  tables.forEach(([tag, length], index) => {
    const record = 12 + index * 16;
    Array.from(tag).forEach((letter, i) => view.setUint8(record + i, letter.charCodeAt(0)));
    view.setUint32(record + 8, offset); view.setUint32(record + 12, length);
    if (tag === "head") view.setUint16(offset + 18, 1000);
    if (tag === "maxp") view.setUint16(offset + 4, 4);
    if (tag === "hhea") view.setUint16(offset + 34, 4);
    if (tag === "cmap") {
      view.setUint16(offset + 2, 1); view.setUint16(offset + 4, 0); view.setUint16(offset + 6, 4); view.setUint32(offset + 8, 12);
      const map = offset + 12; view.setUint16(map, format);
      if (format === 12) {
        view.setUint32(map + 4, 28); view.setUint32(map + 12, 1);
        view.setUint32(map + 16, 63); view.setUint32(map + 20, 65); view.setUint32(map + 24, 1);
      } else {
        view.setUint16(map + 2, 32); view.setUint16(map + 6, 4);
        view.setUint16(map + 14, 65); view.setUint16(map + 16, 65535);
        view.setUint16(map + 20, 63); view.setUint16(map + 22, 65535);
        view.setInt16(map + 24, -62); view.setInt16(map + 26, 1);
      }
    }
    offset += length;
  });
  return buffer;
}

async function hash(bytes: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function setup(fetcher?: typeof fetch, timeoutMs = 100) {
  const bytes = fixture();
  const requests: string[] = [], revoked: string[] = [], created: Blob[] = [];
  const environment: FontEnvironment = {
    baseUrl: "http://localhost:1420/",
    fetch: fetcher ?? (async (input) => { requests.push(String(input)); return new Response(bytes); }) as typeof fetch,
    digest: (buffer) => crypto.subtle.digest("SHA-256", buffer),
    createObjectURL: (blob) => { created.push(blob); return `blob:resident-${created.length}`; },
    revokeObjectURL: (url) => { revoked.push(url); },
  };
  const configuration = { fontUrl: "/font.ttf", fontSha256: await hash(bytes), coverage: [[63, 65]] as const, replacement: "?", timeoutMs };
  return { runtime: new EdaFontRuntime(configuration, environment), configuration, environment, bytes, requests, revoked, created };
}

async function settled(runtime: EdaFontRuntime): Promise<void> {
  if (["ready", "failed"].includes(runtime.getSnapshot().state)) return;
  await new Promise<void>((resolve) => {
    const unsubscribe = runtime.subscribe(() => {
      if (["ready", "failed"].includes(runtime.getSnapshot().state)) { unsubscribe(); resolve(); }
    });
  });
}

describe("verified resident EDA font", () => {
  test("unconfigured does no fetch or eager preload", async () => {
    disposeEdaText();
    const state = await setup();
    expect(getEdaTextRuntime()).toBeNull();
    expect(state.requests).toEqual([]);
    expect(state.created).toEqual([]);
  });

  test("one fetch shared by labels; blob retained until last release", async () => {
    const state = await setup();
    const release1 = state.runtime.acquire(), release2 = state.runtime.acquire();
    await settled(state.runtime);
    expect(state.runtime.getSnapshot()).toEqual({ state: "ready", fontUrl: "blob:resident-1" });
    expect(state.requests).toEqual(["http://localhost:1420/font.ttf"]);
    release1(); expect(state.revoked).toEqual([]);
    release2(); expect(state.revoked).toEqual(["blob:resident-1"]);
  });

  test("404 fails visibly before any blob/Troika", async () => {
    const state = await setup((async () => new Response("missing", { status: 404 })) as typeof fetch);
    state.runtime.acquire(); await settled(state.runtime);
    expect(state.runtime.getSnapshot()).toEqual({ state: "failed", error: "EDA font HTTP 404" });
    expect(state.created).toEqual([]);
  });

  test("corrupt bytes fail SHA pin before creating font URL", async () => {
    const state = await setup((async () => new Response("corrupt")) as typeof fetch);
    state.runtime.acquire(); await settled(state.runtime);
    expect(state.runtime.getSnapshot()).toEqual({ state: "failed", error: "EDA font SHA-256 mismatch" });
    expect(state.created).toEqual([]);
  });

  test("hash-matching corrupt SFNT is rejected", async () => {
    const state = await setup(); const bytes = new TextEncoder().encode("not-a-font").buffer;
    const runtime = new EdaFontRuntime({ ...state.configuration, fontSha256: await hash(bytes) }, { ...state.environment, fetch: (async () => new Response(bytes)) as typeof fetch });
    runtime.acquire(); await settled(runtime);
    expect(runtime.getSnapshot().state).toBe("failed"); expect(state.created).toEqual([]);
  });

  test("hanging fetch gets aborted and deadline settles", async () => {
    let signal: AbortSignal | undefined;
    const state = await setup(((_input, options) => { signal = options?.signal ?? undefined; return new Promise(() => {}); }) as typeof fetch, 10);
    state.runtime.acquire(); await settled(state.runtime);
    expect(signal?.aborted).toBe(true);
    expect(state.runtime.getSnapshot().state).toBe("failed"); expect(state.created).toEqual([]);
  });

  test("unmount aborts; late response cannot publish/create blob", async () => {
    let complete: ((response: Response) => void) | undefined, signal: AbortSignal | undefined;
    const state = await setup(((_input, options) => { signal = options?.signal ?? undefined; return new Promise((resolve) => { complete = resolve; }); }) as typeof fetch);
    const release = state.runtime.acquire(); release();
    complete?.(new Response(state.bytes)); await new Promise((resolve) => setTimeout(resolve, 5));
    expect(signal?.aborted).toBe(true); expect(state.created).toEqual([]); expect(state.runtime.getSnapshot().state).toBe("idle");
  });

  test("failed font does not retry on remount; explicit config creates generation", async () => {
    let count = 0;
    const state = await setup((async () => { count++; return new Response(null, { status: 404 }); }) as typeof fetch);
    const release = state.runtime.acquire(); await settled(state.runtime); release();
    state.runtime.acquire(); expect(count).toBe(1);
    configureEdaText(state.configuration); const first = getEdaTextRuntime();
    configureEdaText(state.configuration); expect(getEdaTextRuntime()).not.toBe(first); disposeEdaText();
  });

  test("remote URLs rejected before fetch; same-origin URLs allowed", () => {
    expect(() => localFontUrl("https://cdn.jsdelivr.net/font.ttf", "https://openpcb.app/")).toThrow("same-origin");
    expect(() => localFontUrl("//other/font.ttf", "https://openpcb.app/")).toThrow("same-origin");
    expect(() => localFontUrl("data:font/ttf;base64,AA", "https://openpcb.app/")).toThrow("same-origin");
    expect(localFontUrl("fonts/font.ttf", "file:///app/index.html")).toBe("file:///app/fonts/font.ttf");
  });
});

describe("font coverage", () => {
  test.each([4, 12] as const)("valid format %s fixture", (format) => expect(() => validateFont(fixture(format), [[63, 65]])).not.toThrow());
  test("format4 glyph-array offsets match Typr (no delta applied)", () => {
    const original = fixture(4), buffer = new ArrayBuffer(original.byteLength + 6);
    new Uint8Array(buffer).set(new Uint8Array(original)); const view = new DataView(buffer);
    const record = 12 + 6 * 16, cmap = view.getUint32(record + 8), map = cmap + 12;
    view.setUint32(record + 12, 50); view.setUint16(map + 2, 38);
    view.setInt16(map + 24, 500); view.setUint16(map + 28, 4);
    for (let i = 0; i < 3; i++) view.setUint16(map + 32 + i * 2, i + 1);
    expect(() => validateFont(buffer, [[63, 65]])).not.toThrow();
    view.setUint16(map + 28, 65534);
    expect(() => validateFont(buffer, [[63, 65]])).toThrow("Invalid or unsupported");
  });
  test("format12 supplementary code points and glyph ID 0", () => {
    const buffer = fixture(12), view = new DataView(buffer), cmap = view.getUint32(12 + 6 * 16 + 8), map = cmap + 12;
    view.setUint32(map + 16, 0x20000); view.setUint32(map + 20, 0x20002);
    expect(() => validateFont(buffer, [[0x20000, 0x20002]])).not.toThrow();
    view.setUint32(map + 24, 0);
    expect(() => validateFont(buffer, [[0x20000, 0x20002]])).toThrow("missing glyph U+20000");
  });
  test("invalid manifest/replacement fails configuration", async () => {
    const state = await setup();
    expect(() => new EdaFontRuntime({ ...state.configuration, replacement: "Ω" }, state.environment)).toThrow("one covered code point");
    expect(() => new EdaFontRuntime({ ...state.configuration, coverage: [[63, 65], [64, 66]] }, state.environment)).toThrow("ordered, disjoint");
    expect(() => new EdaFontRuntime({ ...state.configuration, fontSha256: "" }, state.environment)).toThrow("SHA-256 pin");
  });
  test("lying coverage refused before resolver", () => expect(() => validateFont(fixture(), [[63, 66]])).toThrow("missing glyph U+42"));
  test("malformed table offsets refused", () => {
    const buffer = fixture(); new DataView(buffer).setUint32(20, 0xffffff00);
    expect(() => validateFont(buffer, [[63, 65]])).toThrow("Invalid or unsupported");
  });
  test("unsupported cmap refused", () => {
    const buffer = fixture(); const view = new DataView(buffer); const cmap = view.getUint32(12 + 6 * 16 + 8);
    view.setUint16(cmap + 12, 13); expect(() => validateFont(buffer, [[63, 65]])).toThrow("Invalid or unsupported");
  });
  test("missing Unicode display substituted, domain string unchanged", () => {
    const original = "AΩ𠀀";
    expect(displayText(original, [[63, 65]], "?")).toEqual({ text: "A??", missing: [0x3a9, 0x20000], unrenderable: false });
    expect(original).toBe("AΩ𠀀");
  });
  test("interior controls preserved; unsupported leading control requires whole-label marker", () => {
    expect(displayText("A\nA\tA", [[63, 65]], "?")).toEqual({ text: "A\nA\tA", missing: [], unrenderable: false });
    expect(displayText("\nA", [[63, 65]], "?").unrenderable).toBe(true);
    expect(displayText("", [[63, 65]], "?")).toEqual({ text: "", missing: [], unrenderable: false });
    expect(displayText("  ", [[32, 32], [63, 65]], "?").missing).toEqual([]);
  });
});
