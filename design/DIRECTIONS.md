# Design Direction

**Locked 2026-08-10, confirmed by Anay and Yash: Editorial Paper.**

## Editorial Paper *(Are.na × Instapaper/NYT Reader)*

Keeps the 3 fixed pillars from `docs/PLAN-V1.md §14.1` (dark chrome / paper-white reading surface / pillar-hue graph) and leans the reading-surface pillar harder:

- Warmer, higher-contrast paper with subtle grain texture on paper-sunk surfaces
- Serif creeps into UI chrome (small-caps serif section headers, not just prose)
- Whitespace +25% on the spacing scale in reading contexts
- Pillar saturation softened ~20%
- Motion unhurried: durations +40%, ease-out only, no spring, ever

## Reference

Anay supplied an actual reference board matching this direction: wide-tracked serif small-caps wordmark "PEPIROS," an open-book-and-quill glyph, a torn-paper favicon tile, Source Serif 4 (headings) + Inter (UI) type pairing, and a specific 7-swatch muted earthy palette.

**Canonical Editorial Paper pillar palette** (adopted from the reference, replaces earlier placeholder hex values):

| Name | Hex |
|---|---|
| Stone | `#B8B2A4` |
| Clay | `#C4A78A` |
| Sage | `#7D8A73` |
| Dusk | `#6E6AA7` |
| Rose | `#B46A6A` |
| Ochre | `#D4B26A` |
| Teal | `#5F8D86` |

Tagline: **"Every claim, one click from its source."** (Grounding-first — the reference's original "Research Reading & Citation Graph" line undersold the product; see `docs/PLAN-V1.md §22`.)

## Other directions considered, not built

Three other axes were sketched before Editorial Paper was picked: a Linear/Bloomberg-Terminal-precision direction (monospace-forward, hairline borders, near-zero motion), an Obsidian-graph-view/lab-instrument direction (phosphor glow, higher-chroma palette), and a Muji/Kinfolk field-notebook direction (deckle edges, sticky-note evidence badges). All three kept the same 3 fixed pillars and differed only in the same axes Editorial Paper differs on (type pairing, icon language, card texture, motion character). Not pursued further once Editorial Paper was confirmed by both Anay and Yash.

## Icons

**Lucide** (`lucide-react`), via the `Icon` wrapper in `components/ui/Icon.tsx` — always that wrapper, never a raw `lucide-react` import in a feature component. Fixed convention: 1.5px stroke, no fill, three sizes (`xs` 14px / `sm` 16px / `md` 20px) tied to the type scale rather than picked ad hoc per usage. Editorial Paper is restrained and non-decorative, so icons stay small, single-color (`currentColor`), and functional — never a colorful icon set, never an icon standing in for a label on its own without an `aria-label`.

## Prompts

Image-generation prompts for the brand kit and all 8 app surfaces live in `design/prompts/`. The canonical brand-assets prompt is `design/prompts/brand.md`.
