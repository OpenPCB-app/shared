# @openpcb/kicad-import

KiCad → normalized "OpenPCB JSON" import layer.

## Exports

- `parseImportBundle`, `buildInspectResponse` — main entry
- `buildSymbolPreviewFromParsed`, `buildFootprintPreviewFromParsed`
- `validateFootprintPads`, `validateSymbolPinsCoverFootprintPads`
- `classifyModel3DLinks` — orphan/missing/shared 3D model resolution
- `extractPackageCode`, `groupFootprints` — family heuristics
- `buildIdentityPinMapJson`
- `KicadImportValidationError` (aliased as `ImportValidationError`)
- `kicadPointToCanonical`, `kicadPadToCanonical`, `KICAD_FOOTPRINT_TRANSFORM_VERSION`,
  `KICAD_FOOTPRINT_FRAME_STAMP` — the KiCad → canonical frame conversion
- `compareFrameConversion` — frame-delta report between a pre-0.2.0 preview and a 0.2.0 one

## Coordinate frame (0.2.0, BREAKING)

KiCad footprint files (`.kicad_mod`) are **Y-down**. OpenPCB's canonical model is **Y-up**.
From 0.2.0, every footprint preview is converted once, here, and stamped:

```ts
preview.frame; // { frame: "openpcb-y-up", origin: "kicad-converted", transformVersion: 1, tool: "@openpcb/kicad-import" }
```

With `N = diag(1, −1)`:

- **Points** (pad centres, graphics, label anchors, bounds): `p = N·p_kicad`, i.e. `y` is negated.
  A `y` of zero stays `+0`.
- **Angles** (pad and text rotation): **unchanged**. KiCad's angles are visually CCW, which is
  math-CCW in a Y-up frame (`N·RotK(p, θ) = R(θ)·N·p`).
- **Arcs** are mapped point by point (start/mid/end), so their signed turn reverses, as a
  reflection must. Rects are converted corner by corner before their origin is taken.
- **Drill offsets** follow KiCad `PAD::ShapePos` (pcbnew/pad.cpp): KiCad puts the **hole** at the
  pad's `at` and the **copper** at `at + RotK(offset, α)`. The preview keeps OpenPCB's native
  convention — copper at `centerMm`, hole at `centerMm + R(α)·drillOffsetMm` — so:
  - `centerMm = N·at + R(α)·N·offset`
  - `drillOffsetMm = −N·offset = (−ox, +oy)`
  - and the hole lands at `N·at`.

  Before 0.2.0, `centerMm` was `at` and `drillOffsetMm` was `offset`: copper and hole were
  swapped.
- **Unchanged**: pad ids (`${number}:${index}`), numbers, shapes, sizes, slots, plating, layers.
  Label ids embed the anchor coordinates, so they change with the frame.
- **Not converted**: the parsed `raw` footprint (stays in the KiCad frame; never mutated) and
  symbols (`.kicad_sym` coordinates are Y-up already).

`transformVersion` is bumped whenever the conversion output changes for the same input. The stamp
is a producer claim: a consumer that receives a model from an untrusted source must check the
geometry against `raw`, not trust the stamp.

`compareFrameConversion(oldK, newC)` reports how a stored pre-0.2.0 preview and the 0.2.0 preview
of the same raw footprint differ: copper invariant failures per electrical pad (`padViolations`),
allowed additions (plating flag, courtyard/mask/paste graphics, paste sub-pads, the stamp, label
ids) and anything else (`other`, e.g. a newly read slot). `frameOnly` is true only when there are
no pad violations and no `other` entries.
