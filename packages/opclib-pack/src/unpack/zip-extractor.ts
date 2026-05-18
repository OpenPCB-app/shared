/**
 * Node-flavoured ZIP extractor. Reads central directory + local headers,
 * inflates entries via `node:zlib`'s raw deflate, applies size caps.
 *
 * Shared between OpenPCB's KiCad ZIP import path (`commit-kicad-zip.ts`) and
 * the `.opclib` unpacker. Throws `OpclibFormatError` on malformed input so the
 * library route handler maps it to a problem-details 400.
 */
import { inflateRawSync } from "node:zlib";
import { OpclibFormatError } from "../errors.js";
import { ZIP_LIMITS } from "../validate/constants.js";

export { ZIP_LIMITS };

export interface ZipEntryContent {
  path: string;
  baseName: string;
  extension: string;
  size: number;
  bytes: Uint8Array;
}

function readUInt16(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

function normalizeEntryPath(name: string): string | null {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.length === 0 || normalized.endsWith("/")) return null;
  const parts = normalized.split("/");
  if (parts.some((part) => part === ".." || part.length === 0)) return null;
  return normalized;
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot).toLowerCase() : "";
}

function baseNameOf(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === 0x06054b50) return offset;
  }
  throw new OpclibFormatError(
    "Invalid ZIP archive: central directory not found",
  );
}

function inflateEntry(
  compressed: Buffer,
  method: number,
  expectedSize: number,
  path: string,
): Uint8Array {
  if (method === 0) return new Uint8Array(compressed);
  if (method === 8) {
    const inflated = inflateRawSync(compressed);
    if (inflated.length !== expectedSize) {
      throw new OpclibFormatError(`Invalid ZIP entry size for ${path}`);
    }
    return new Uint8Array(inflated);
  }
  throw new OpclibFormatError(
    `Unsupported ZIP compression method ${method} for ${path}`,
  );
}

export function extractZipEntries(input: Uint8Array): ZipEntryContent[] {
  if (input.byteLength > ZIP_LIMITS.maxArchiveBytes) {
    throw new OpclibFormatError("ZIP archive exceeds the 50 MiB limit");
  }

  const buffer = Buffer.from(input);
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, eocdOffset + 10);
  const centralDirOffset = readUInt32(buffer, eocdOffset + 16);

  if (entryCount > ZIP_LIMITS.maxEntries) {
    throw new OpclibFormatError("ZIP archive contains too many files");
  }

  const entries: ZipEntryContent[] = [];
  let cursor = centralDirOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, cursor) !== 0x02014b50) {
      throw new OpclibFormatError(
        "Invalid ZIP archive: malformed central directory",
      );
    }

    const method = readUInt16(buffer, cursor + 10);
    const compressedSize = readUInt32(buffer, cursor + 20);
    const uncompressedSize = readUInt32(buffer, cursor + 24);
    const nameLength = readUInt16(buffer, cursor + 28);
    const extraLength = readUInt16(buffer, cursor + 30);
    const commentLength = readUInt16(buffer, cursor + 32);
    const localHeaderOffset = readUInt32(buffer, cursor + 42);
    const rawName = buffer
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString("utf8");
    cursor += 46 + nameLength + extraLength + commentLength;

    const normalizedPath = normalizeEntryPath(rawName);
    if (!normalizedPath) continue;

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > ZIP_LIMITS.maxTotalUncompressedBytes) {
      throw new OpclibFormatError(
        "ZIP archive exceeds the 200 MiB uncompressed limit",
      );
    }

    if (readUInt32(buffer, localHeaderOffset) !== 0x04034b50) {
      throw new OpclibFormatError(
        `Invalid ZIP local header for ${normalizedPath}`,
      );
    }
    const localNameLength = readUInt16(buffer, localHeaderOffset + 26);
    const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
    const dataOffset =
      localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const bytes = inflateEntry(
      compressed,
      method,
      uncompressedSize,
      normalizedPath,
    );
    entries.push({
      path: normalizedPath,
      baseName: baseNameOf(normalizedPath),
      extension: extensionOf(normalizedPath),
      size: uncompressedSize,
      bytes,
    });
  }

  if (entries.length === 0) {
    throw new OpclibFormatError("ZIP archive does not contain any files");
  }

  return entries;
}

export function decodeTextEntry(entry: ZipEntryContent): string {
  if (entry.size > ZIP_LIMITS.maxTextFileBytes) {
    throw new OpclibFormatError(
      `${entry.baseName} exceeds the 5 MiB text-file limit`,
    );
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(entry.bytes);
}
