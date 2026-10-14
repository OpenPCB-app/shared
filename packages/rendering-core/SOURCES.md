# IPC-7351B generator — dimension sources and comparison tolerances

The SOT and QFN presets in `src/ipc7351b/family-presets.ts` use nominal
package dimensions from the drawings below (nominal = midpoint of min/max, or
the drawing's stated nominal/basic value). Lands are IPC-7351B nominal-dimension
lands: the pad spans the lead foot plus the density's toe/heel/side additions
(`src/ipc7351b/ipc-dimensions.ts`). No tolerance stack-up is applied, and no
certification is claimed.

Fixtures: `tests/fixtures/ipc7351b-drawings.ts` (drawing values, transcribed
independently of the presets) and `tests/ipc7351b-geometry.test.ts`.

## Package drawings

| Preset   | Standard          | Drawing                                                                 | e    | HE / E | Lp / L | bp / b | Other                 |
| -------- | ----------------- | ----------------------------------------------------------------------- | ---- | ------ | ------ | ------ | --------------------- |
| SOT-23   | JEDEC TO-236AB    | NXP SOT23 package information (sot023_po, issue 14-09-22)               | 0.95 | 2.1–2.5 | 0.15–0.45 | 0.38–0.48 | D 2.8–3.0, E 1.2–1.4 |
| SOT-23-5 | JEDEC MO-178AA    | Renesas P5.064 (KA0005AB) Rev04, 2025-07-22                             | 0.95 | 2.80   | 0.45   | 0.40   | D 2.90, E1 1.60       |
| SOT-23-6 | JEDEC MO-178AB    | Renesas P6.064 (KA0006AB) Rev06                                         | 0.95 | 2.80   | 0.45   | 0.40   | D 2.90, E1 1.60       |
| SOT-223  | JEDEC TO-261AA    | NXP SOT223 (SC-73) package information; cross-check Vishay DWG 5969 (TO-261AA) | 2.30 | 6.7–7.3 | 0.7–1.1 | 0.6–0.8 | b1 2.9–3.1, D 6.3–6.7, E 3.3–3.7 |
| SOT-323  | JEITA SC-70       | NXP SOT323 package information                                           | 0.65 | 2.0–2.2 | 0.15–0.45 | 0.3–0.4 | D 1.8–2.2, E 1.15–1.35 |

| Preset | Standard           | Drawing                | D   | e   | L        | b        | D2 = E2   |
| ------ | ------------------ | ---------------------- | --- | --- | -------- | -------- | --------- |
| QFN-16 | MO-220-VEED-4      | Analog Devices CP-16-50 | 3.00 | 0.5 | 0.35–0.45 | 0.20–0.30 | 1.50–1.70 |
| QFN-20 | MO-220-VGGD-1      | Analog Devices CP-20-1  | 4.00 | 0.5 | 0.50 / 0.60 / 0.75 | 0.18 / 0.23 / 0.30 | 1.95–2.25 |
| QFN-24 | MO-220-VGGD-2      | Analog Devices CP-24-1  | 4.00 | 0.5 | 0.30–0.50 | 0.18 / 0.23 / 0.30 | 1.95–2.25 |
| QFN-32 | MO-220-VHHD-2      | Analog Devices CP-32-2  | 5.00 | 0.5 | 0.30–0.50 | 0.18 / 0.23 / 0.30 | 2.95–3.25 |

Pin layout and numbering (counter-clockwise from pin 1, top view):

- SOT-23 / SOT-323: pins 1, 2 on the left row (slots 1 and 3), pin 3 on the right, opposite the empty middle slot.
- SOT-23-5: pins 1–3 on the left; pin 4 opposite pin 3, pin 5 opposite pin 1, right middle slot empty.
- SOT-23-6: pins 1–3 left, 4–6 right (4 opposite 3).
- SOT-223: pins 1–3 left; the wide tab is pin 4, centred on the right (TO-261AA numbering).
- QFN: pin 1 top of the left side, counter-clockwise; exposed pad is pin N + 1.

## QFN exposed-pad clearance

The exposed pad is the nominal D2, shrunk only if needed so every signal land
keeps `QFN_EP_MIN_GAP_MM` = 0.20 mm to it. The drawings above guarantee a
paddle-to-terminal distance K ≥ 0.20 mm (CP-16-50) / 0.25 mm (CP-20-1, CP-24-1,
CP-32-2); the eda-standards skill gives no land-level value, so the smaller K
is used. All four presets keep their nominal D2 at every density.

## Comparison against KiCad (oracle)

`tests/fixtures/ipc7351b-kicad-oracle.ts` holds the copper pads of the KiCad
standard library footprints at kicad-footprints commit `cb8299c2` (2026-06-16),
compared at the `nominal` density with KiCad's Y axis negated:

| Preset   | KiCad footprint                                   | Centre | Signal size | Large pad (EP/tab) |
| -------- | ------------------------------------------------- | ------ | ----------- | ------------------ |
| SOT-23   | `Package_TO_SOT_SMD/SOT-23`                       | 0.10   | 0.50        | —                  |
| SOT-23-5 | `Package_TO_SOT_SMD/SOT-23-5`                     | 0.10   | 0.50        | —                  |
| SOT-23-6 | `Package_TO_SOT_SMD/SOT-23-6`                     | 0.10   | 0.50        | —                  |
| SOT-223  | `Package_TO_SOT_SMD/SOT-223`                      | 0.10   | 0.75        | 0.75               |
| SOT-323  | `Package_TO_SOT_SMD/SOT-323_SC-70`                | 0.10   | 0.50        | —                  |
| QFN-16   | `Package_DFN_QFN/QFN-16-1EP_3x3mm_P0.5mm_EP1.7x1.7mm`   | 0.10 | 0.50 | 0.40 |
| QFN-20   | `Package_DFN_QFN/QFN-20-1EP_4x4mm_P0.5mm_EP2.5x2.5mm`   | 0.10 | 0.50 | 0.40 |
| QFN-24   | `Package_DFN_QFN/QFN-24-1EP_4x4mm_P0.5mm_EP2.15x2.15mm` | 0.10 | 0.50 | 0.40 |
| QFN-32   | `Package_DFN_QFN/QFN-32-1EP_5x5mm_P0.5mm_EP3.1x3.1mm`   | 0.10 | 0.50 | 0.40 |

Tolerances are in mm, per axis. Why the size tolerance is wider than the
centre tolerance: KiCad's generator sizes lands from the min/max tolerance
stack (IPC-7351B Z/G/X equations), which lengthens pads when a drawing's foot
length range is wide (SOT-23 Lp 0.15–0.45 → KiCad 1.475 mm vs 1.00 mm here).
KiCad's `SOT-223` is a legacy hand-drawn footprint ("module CMS SOT223"), 0.74 mm
wider than the nominal land, hence 0.75. No KiCad 4x4 QFN-20 uses the MO-220
VGGD-1 2.10 mm paddle; the nearest (Microchip, 2.5 mm) sets the 0.40 EP bound.

Observed at commit time (nominal): centre deltas ≤ 0.10 (SOT-223), ≤ 0.0875
(QFN-20), otherwise ≤ 0.0625; signal-size deltas ≤ 0.475 (SOT-23 length).

## Not covered here

- Chip, SOIC and QFP presets are checked for count, numbering, pitch, span and
  copper gap only; they have no cited drawings and no KiCad comparison yet.
- Silkscreen is still the nominal body rectangle and is not clipped from pads.
