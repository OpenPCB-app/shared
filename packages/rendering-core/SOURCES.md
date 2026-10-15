# IPC-7351B generator — dimension sources and comparison tolerances

The chip, SOT and QFN presets in `src/ipc7351b/family-presets.ts` use nominal
package dimensions from the drawings below (nominal = midpoint of min/max, or
the drawing's stated nominal/basic value). Lands are IPC-7351B nominal-dimension
lands: the pad spans the lead foot plus the density's toe/heel/side additions
(`src/ipc7351b/ipc-dimensions.ts`). No tolerance stack-up is applied, and no
certification is claimed.

Fixtures: `tests/fixtures/ipc7351b-drawings.ts` (drawing values, transcribed
independently of the presets) and `tests/ipc7351b-geometry.test.ts`. Where a
preset literal and its drawing disagree, the drawing wins.

## Chip drawings

Chip family = **resistor** terminal dimensions; MLCC terminal bands differ;
footprint names keep the historical `C_` prefix. The same drawings back every
chip preset, whatever part (R, C, L) is placed on it.

| Preset | Drawing                                                              | L         | W         | T         |
| ------ | -------------------------------------------------------------------- | --------- | --------- | --------- |
| 0201   | Vishay CRCW0201 e3, document 20052, rev 21-Sep-2022, p. 2            | 0.57–0.63 | 0.27–0.33 | 0.10–0.20 |
| 0402   | IPC-SM-782 §8.1 "Chip Resistors" Rev A (5/96), Figure 2, 1005 [0402] | 1.00–1.10 | 0.48–0.60 | 0.10–0.30 |
| 0603   | IPC-SM-782 §8.1 Figure 2, 1608 [0603]                                | 1.50–1.70 | 0.70–0.95 | 0.15–0.40 |
| 0805   | IPC-SM-782 §8.1 Figure 2, 2012 [0805]                                | 1.85–2.15 | 1.10–1.40 | 0.15–0.65 |
| 1206   | IPC-SM-782 §8.1 Figure 2, 3216 [1206]                                | 3.05–3.35 | 1.45–1.75 | 0.25–0.75 |
| 1210   | IPC-SM-782 §8.1 Figure 2, 3225 [1210]                                | 3.05–3.35 | 2.34–2.64 | 0.25–0.75 |
| 2010   | IPC-SM-782 §8.1 Figure 2, 5025 [2010]                                | 4.85–5.15 | 2.35–2.65 | 0.35–0.85 |
| 2512   | IPC-SM-782 §8.1 Figure 2, 6332 [2512]                                | 6.15–6.45 | 3.05–3.35 | 0.35–0.85 |

These are the drawings KiCad's `R_*` footprints cite in their `descr`
(IPC-SM-782 page 72 of the amendment 1 and 2 compilation; Vishay CRCW0201 e3).
KiCad's pcb-3d.com link to the IPC-SM-782 compilation returned 404 on
2026-10-15; the values above were read from its web.archive.org copy (228
pages, sha256 `e6b3c0c4…7a71bce`), PDF page 72. The 0201 drawing gives L 0.6 ± 0.03, W 0.3 ± 0.03 and two terminal bands,
T1 0.15 ± 0.05 and T2 0.10 ± 0.05. The land uses T1, the longer band, as
KiCad does. Transcribing the drawings corrected five preset literals in three
sizes: 0402 L 1.0 → 1.05 and W 0.5 → 0.54, 0603 W 0.8 → 0.825 and
T 0.3 → 0.275, 1210 W 2.5 → 2.49.

Land, per pad: length T + toe + heel, width W + 2·side, centre
±((L − T)/2 + (toe − heel)/2) on X, no rotation. The land therefore spans the
terminal from its inner end (minus heel) to the body end (plus toe). Silk is the
body outline L × W, not yet clipped from the pads. Courtyard width = outer pad
edges plus the courtyard excess on each side; courtyard height =
max(W, land width) plus the courtyard excess on each side.

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
| 0201–2512 | `Resistor_SMD/R_<size>_<metric>Metric` (8 rows) | 0.10   | 0.50        | —                  |
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

Chip family (D7): the oracle is KiCad `R_*`, the footprints built from the
same resistor drawings. Observed at commit time, nominal density (generator
|x| and land L × W against KiCad):

| Preset | Generator \|x\|, size | KiCad \|x\|, size    | Δ centre | Δ size (x, y)  |
| ------ | --------------------- | -------------------- | -------- | -------------- |
| 0201   | 0.40, 0.50 × 0.30       | 0.32, 0.46 × 0.40      | 0.080    | 0.040, 0.100   |
| 0402   | 0.60, 0.55 × 0.54       | 0.51, 0.54 × 0.64      | 0.090    | 0.010, 0.100   |
| 0603   | 0.8375, 0.625 × 0.825   | 0.825, 0.80 × 0.95     | 0.0125   | 0.175, 0.125   |
| 0805   | 0.975, 0.75 × 1.25      | 0.9125, 1.025 × 1.40   | 0.0625   | 0.275, 0.150   |
| 1206   | 1.525, 0.85 × 1.60      | 1.4625, 1.125 × 1.75   | 0.0625   | 0.275, 0.150   |
| 1210   | 1.525, 0.85 × 2.49      | 1.4625, 1.125 × 2.65   | 0.0625   | 0.275, 0.160   |
| 2010   | 2.375, 0.95 × 2.50      | 2.3125, 1.225 × 2.65   | 0.0625   | 0.275, 0.150   |
| 2512   | 3.025, 0.95 × 3.20      | 2.9625, 1.225 × 3.35   | 0.0625   | 0.275, 0.150   |

All chip deltas are inside the starting tolerances (centre 0.10, size 0.50),
so no chip tolerance was widened. The two largest centre deltas (0201, 0402)
come from the toe addition: the generator applies its single chip density
table (toe 0.35 nominal) to every size, while KiCad's IPC-7351B config
(kicad-footprint-generator `src/kilibs/config/ipc_configs/ipc7351B_2terminal.yaml`,
`ipc_spec_smaller_0603`) uses toe 0.20 nominal below 1608 [0603]. Re-sourcing
the density addition tables is out of scope here. The size deltas come from
KiCad's min/max tolerance stack, as for SOT and QFN.

## Not covered here

- SOIC and QFP presets are checked for count, numbering, pitch, span and
  copper gap only; they have no cited drawings and no KiCad comparison yet.
- Silkscreen is still the nominal body rectangle and is not clipped from pads.
