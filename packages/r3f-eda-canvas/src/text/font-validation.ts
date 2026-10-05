export type GlyphCoverage = readonly (readonly [number, number])[];

function fail(): never {
  throw new Error("Invalid or unsupported EDA font (expected SFNT TTF/OTF)");
}

function tableView(data: DataView, tag: string): DataView {
  const count = data.getUint16(4);
  if (12 + count * 16 > data.byteLength) fail();
  for (let i = 0; i < count; i++) {
    const start = 12 + i * 16;
    const name = String.fromCharCode(...[0, 1, 2, 3].map((n) => data.getUint8(start + n)));
    if (name !== tag) continue;
    const offset = data.getUint32(start + 8);
    const length = data.getUint32(start + 12);
    if (!length || offset + length > data.byteLength) fail();
    return new DataView(data.buffer, data.byteOffset + offset, length);
  }
  return fail();
}

function selectedCmap(cmap: DataView): DataView {
  const count = cmap.getUint16(2);
  if (4 + count * 8 > cmap.byteLength) fail();
  // This priority matches Troika 0.52's bundled Typr codeToGlyph implementation.
  for (const [platform, encoding] of [[0, 4], [3, 1], [1, 0], [0, 3]]) {
    for (let i = 0; i < count; i++) {
      const start = 4 + i * 8;
      if (cmap.getUint16(start) !== platform || cmap.getUint16(start + 2) !== encoding) continue;
      const offset = cmap.getUint32(start + 4);
      if (offset + 4 > cmap.byteLength) fail();
      const format = cmap.getUint16(offset);
      const length = format === 12 ? cmap.getUint32(offset + 4) : cmap.getUint16(offset + 2);
      if (length < 6 || offset + length > cmap.byteLength) fail();
      return new DataView(cmap.buffer, cmap.byteOffset + offset, length);
    }
  }
  return fail();
}

function format4Glyph(map: DataView, code: number): number {
  const count = map.getUint16(6) / 2;
  if (!Number.isInteger(count) || count < 1 || 16 + count * 8 > map.byteLength) fail();
  for (let i = 0; i < count; i++) {
    if (code > map.getUint16(14 + i * 2)) continue;
    const start = map.getUint16(16 + count * 2 + i * 2);
    if (code < start) return 0;
    const rangeOffset = 16 + count * 6 + i * 2;
    const range = map.getUint16(rangeOffset);
    if (!range) return (code + map.getInt16(16 + count * 4 + i * 2)) & 0xffff;
    const glyphOffset = rangeOffset + range + (code - start) * 2;
    if (glyphOffset + 2 > map.byteLength) fail();
    // Match Typr's mapping exactly, including its idRangeOffset handling.
    return map.getUint16(glyphOffset);
  }
  return 0;
}

function cmapGlyph(map: DataView, code: number): number {
  const format = map.getUint16(0);
  if (format === 0) {
    if (map.byteLength < 262) fail();
    return code < 256 ? map.getUint8(6 + code) : 0;
  }
  if (format === 4) return format4Glyph(map, code);
  if (format !== 12 || map.byteLength < 16) return fail();
  const count = map.getUint32(12);
  if (16 + count * 12 > map.byteLength) fail();
  for (let i = 0; i < count; i++) {
    const start = 16 + i * 12;
    const first = map.getUint32(start);
    const last = map.getUint32(start + 4);
    if (first > last || last > 0x10ffff) fail();
    if (code >= first && code <= last) return map.getUint32(start + 8) + code - first;
  }
  return 0;
}

export function coversCodePoint(coverage: GlyphCoverage, code: number): boolean {
  return coverage.some(([first, last]) => code >= first && code <= last);
}

export function validateCoverage(coverage: GlyphCoverage, replacement: string): void {
  let previous = -1;
  if (!coverage.length) throw new Error("EDA font coverage is empty");
  for (const [first, last] of coverage) {
    if (!Number.isInteger(first) || !Number.isInteger(last) || first <= previous || first < 0 || last < first || last > 0x10ffff) {
      throw new Error("EDA font coverage must be ordered, disjoint Unicode intervals");
    }
    previous = last;
  }
  if (Array.from(replacement).length !== 1 || !coversCodePoint(coverage, replacement.codePointAt(0) ?? -1)) {
    throw new Error("EDA replacement must be one covered code point");
  }
}

export function validateFont(data: ArrayBuffer, coverage: GlyphCoverage): void {
  try {
    const view = new DataView(data);
    if (view.byteLength < 12 || ![0x00010000, 0x4f54544f].includes(view.getUint32(0))) fail();
    const head = tableView(view, "head");
    const maxp = tableView(view, "maxp");
    const hhea = tableView(view, "hhea");
    const hmtx = tableView(view, "hmtx");
    const glyphCount = maxp.getUint16(4);
    if (head.byteLength < 54 || head.getUint16(18) === 0 || hhea.byteLength < 36 || glyphCount < 2) fail();
    if (hmtx.byteLength < hhea.getUint16(34) * 4) fail();
    if (view.getUint32(0) === 0x4f54544f) tableView(view, "CFF ");
    else { tableView(view, "glyf"); tableView(view, "loca"); }
    const map = selectedCmap(tableView(view, "cmap"));
    for (const [first, last] of coverage) {
      for (let code = first; code <= last; code++) {
        const glyph = cmapGlyph(map, code);
        if (!glyph || glyph >= glyphCount) throw new Error(`EDA coverage includes missing glyph U+${code.toString(16).toUpperCase()}`);
      }
    }
  } catch (error) {
    if (error instanceof RangeError) fail();
    throw error;
  }
}

export function displayText(text: string, coverage: GlyphCoverage, replacement: string): { text: string; missing: number[]; unrenderable: boolean } {
  const missing = new Set<number>();
  let unrenderable = false;
  const output = Array.from(text, (character, index) => {
    const code = character.codePointAt(0) ?? 0;
    if (coversCodePoint(coverage, code)) return character;
    if (["\n", "\r", "\t"].includes(character)) {
      if (index === 0) { unrenderable = true; missing.add(code); }
      return character;
    }
    missing.add(code);
    return replacement;
  }).join("");
  return { text: output, missing: [...missing], unrenderable };
}
