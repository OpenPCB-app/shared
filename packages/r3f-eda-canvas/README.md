# @openpcb/r3f-eda-canvas

React Three Fiber canvas engine for OpenPCB EDA editors. Coordinate pipeline (nm↔mm↔px), layer system, primitives (InstancedMesh pads/pins, LineSegments2 traces, drei Text), scene renderers (symbol, footprint), preview canvases, camera, interaction (drag, marquee), theme.

Browser-only. Peer deps: `react`, `react-dom`, `three`, `@react-three/fiber`, `@react-three/drei`, `troika-three-text`.

## Offline text configuration

Configure the font before mounting any editor or preview. The application must ship a licensed, pinned SFNT `.ttf` or `.otf` font and its actual cmap coverage. This package has no default font, remote font URL, or import-time font preload.

```typescript
import { configureEdaText } from "@openpcb/r3f-eda-canvas";

configureEdaText({
  fontUrl: "/assets/eda-font.ttf",
  fontSha256: bundledFontManifest.sha256,
  coverage: bundledFontManifest.coverage,
  replacement: "?",
  timeoutMs: 5000,
});
```

`coverage` is an ordered list of disjoint inclusive Unicode code-point intervals. Generate it from the font's cmap selected by Troika 0.52's Typr parser (`p0e4`, `p3e1`, `p1e0`, then `p0e3`), excluding glyph ID 0. The replacement must be one covered code point. Pin the exact font bytes with SHA-256. Keep the font license and manifest alongside the bundled asset. WOFF, WOFF2, TTC, and unsupported cmap formats are rejected; cmap formats 0, 4, and 12 are supported.

The first visible label fetches the same-origin font with redirects refused and an abort deadline, verifies its hash and coverage, then gives Troika a resident blob URL. Concurrent labels share the fetch and resident font. Unconfigured labels make no font requests. External font URLs, HTTP errors, corrupt fonts, invalid coverage, and missed deadlines produce visible crossed outline markers. A failed font is not automatically retried.

Unsupported glyphs are replaced for display only. Original label/domain strings are never modified. Interior newline, carriage-return, and tab layout is preserved. An unsupported leading control character produces a whole-label marker because Troika would otherwise query its external Unicode resolver. Empty labels render nothing. Complete Unicode coverage is not implied: applications must qualify the glyphs and scripts they require against their chosen font.

Each label owns its Suspense/error boundary and a deadline covering both preload and the first `onSync`. A failed label does not suspend sibling labels or scene geometry. `EDAText` accepts `onTextStatus` to report `pending`, `ready`, or `fallback`, including missing code points or the failure reason. No telemetry is sent. Changing the font configuration creates an explicit new generation and fresh resident URL, which avoids Troika's poisoned load cache. Call `disposeEdaText()` at application shutdown. Pending fetches and timers are cancelled when no labels remain; resident URLs are revoked after their last label releases them.

The normal rendering path preserves EDAText's geometry-unit contract, including the default font size of `250_000`, anchors, rotation, render order, opacity, depth testing, and permanently disabled depth writing. Font selection and resulting normal text metrics are explicit application decisions. Fallback markers use estimated em bounds, not font fit measurements; never use those markers to derive domain fit bounds or manufacturing output.

## Verification

```sh
bun test packages/r3f-eda-canvas/src/text/runtime.test.ts
bun test packages/r3f-eda-canvas/src/text/import.test.ts
npx tsc -p packages/r3f-eda-canvas/tsconfig.build.json
```

`npm test` runs the pure runtime, import, and real-font fixture regressions. The dependency-free browser harness and installed `playwright-cli` invocation are documented in `tests/browser/README.md`. Qualify actual editor, preview, and 3D consumers in cold browser and packaged Electron profiles with external networking denied. Source tests do not establish native GPU or packaged-app acceptance.
