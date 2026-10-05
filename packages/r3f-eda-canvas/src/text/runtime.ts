import { displayText, validateCoverage, validateFont, type GlyphCoverage } from "./font-validation.js";

export interface EdaTextConfiguration {
  /** Same-origin bundled SFNT TTF/OTF. Redirects and external URLs are refused. */
  fontUrl: string;
  fontSha256: string;
  coverage: GlyphCoverage;
  replacement: string;
  timeoutMs?: number;
}

export interface EdaTextStatus {
  state: "pending" | "ready" | "fallback";
  reason?: "unconfigured" | "font-error" | "missing-glyph" | "text-error" | "text-timeout";
  error?: string;
  missingCodePoints?: readonly number[];
}

export type FontSnapshot =
  | { state: "idle" | "loading" }
  | { state: "failed"; error: string }
  | { state: "ready"; fontUrl: string };

export interface FontEnvironment {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  digest: (bytes: ArrayBuffer) => Promise<ArrayBuffer>;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_FONT_BYTES = 20 * 1024 * 1024;
const configurationListeners = new Set<() => void>();
let currentRuntime: EdaFontRuntime | null = null;

function browserEnvironment(): FontEnvironment {
  return {
    baseUrl: typeof location === "undefined" ? "" : location.href,
    fetch: (...args) => globalThis.fetch(...args),
    digest: (bytes) => globalThis.crypto.subtle.digest("SHA-256", bytes),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
  };
}

export function localFontUrl(fontUrl: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  const url = new URL(fontUrl, base);
  if (["data:", "blob:"].includes(url.protocol) || url.protocol !== base.protocol || url.host !== base.host || url.username || url.password) {
    throw new Error("EDA font must be a bundled same-origin URL");
  }
  return url.href;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function checkedConfiguration(configuration: EdaTextConfiguration): EdaTextConfiguration {
  validateCoverage(configuration.coverage, configuration.replacement);
  if (!/^[a-fA-F0-9]{64}$/.test(configuration.fontSha256)) throw new Error("EDA font requires a SHA-256 pin");
  const timeoutMs = configuration.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) throw new Error("EDA font timeout must be within (0, 60000] ms");
  return {
    ...configuration,
    fontSha256: configuration.fontSha256.toLowerCase(),
    coverage: configuration.coverage.map(([first, last]) => [first, last] as const),
    timeoutMs,
  };
}

export class EdaFontRuntime {
  readonly configuration: EdaTextConfiguration;
  private snapshot: FontSnapshot = { state: "idle" };
  private readonly listeners = new Set<() => void>();
  private controller: AbortController | null = null;
  private residentUrl: string | null = null;
  private users = 0;
  private attempt = 0;
  private disposed = false;

  constructor(configuration: EdaTextConfiguration, private readonly environment: FontEnvironment = browserEnvironment()) {
    this.configuration = checkedConfiguration(configuration);
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  readonly getSnapshot = (): FontSnapshot => this.snapshot;

  acquire(): () => void {
    if (this.disposed) return () => {};
    this.users++;
    if (this.snapshot.state === "idle") void this.load();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.users--;
      if (!this.users) this.releaseResources();
    };
  }

  dispose(): void {
    this.disposed = true;
    this.releaseResources();
    this.listeners.clear();
  }

  text(text: string): ReturnType<typeof displayText> {
    return displayText(text, this.configuration.coverage, this.configuration.replacement);
  }

  private publish(snapshot: FontSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  private releaseResources(): void {
    this.attempt++;
    this.controller?.abort();
    this.controller = null;
    if (this.residentUrl) this.environment.revokeObjectURL(this.residentUrl);
    this.residentUrl = null;
    // Failed attempts remain failed until explicit reconfiguration.
    if (this.snapshot.state !== "failed") this.publish({ state: "idle" });
  }

  private async verifiedBytes(signal: AbortSignal): Promise<ArrayBuffer> {
    const url = localFontUrl(this.configuration.fontUrl, this.environment.baseUrl);
    const response = await this.environment.fetch(url, { signal, redirect: "error", credentials: "same-origin" });
    if (!response.ok) throw new Error(`EDA font HTTP ${response.status}`);
    if (Number(response.headers.get("content-length")) > MAX_FONT_BYTES) throw new Error("EDA font exceeds size limit");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_FONT_BYTES) throw new Error("EDA font exceeds size limit");
    signal.throwIfAborted();
    const digest = await this.environment.digest(bytes);
    signal.throwIfAborted();
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== this.configuration.fontSha256) throw new Error("EDA font SHA-256 mismatch");
    validateFont(bytes, this.configuration.coverage);
    return bytes;
  }

  private async load(): Promise<void> {
    const attempt = ++this.attempt;
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ state: "loading" });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("EDA font deadline exceeded"));
        controller.abort();
      }, this.configuration.timeoutMs);
      controller.signal.addEventListener("abort", () => reject(new Error("EDA font load cancelled")), { once: true });
    });
    try {
      const bytes = await Promise.race([this.verifiedBytes(controller.signal), deadline]);
      if (this.attempt !== attempt) return;
      this.residentUrl = this.environment.createObjectURL(new Blob([bytes], { type: "font/ttf" }));
      this.publish({ state: "ready", fontUrl: this.residentUrl });
    } catch (error) {
      if (this.attempt === attempt) this.publish({ state: "failed", error: errorMessage(error) });
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) this.controller = null;
    }
  }
}

/** Configure before mounting canvases. Calling again is the explicit retry/new font generation. */
export function configureEdaText(configuration: EdaTextConfiguration): void {
  const runtime = new EdaFontRuntime(configuration);
  currentRuntime?.dispose();
  currentRuntime = runtime;
  for (const listener of configurationListeners) listener();
}

/** Release the active configuration when the application shuts down. */
export function disposeEdaText(): void {
  currentRuntime?.dispose();
  currentRuntime = null;
  for (const listener of configurationListeners) listener();
}

export function getEdaTextRuntime(): EdaFontRuntime | null { return currentRuntime; }

export function subscribeEdaText(listener: () => void): () => void {
  configurationListeners.add(listener);
  return () => { configurationListeners.delete(listener); };
}
