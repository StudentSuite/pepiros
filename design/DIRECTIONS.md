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

Tagline: **"Every claim, one click from its source."** (Grounding-first: the reference's original "Research Reading & Citation Graph" line undersold the product; see `docs/PLAN-V1.md §22`.)

## Other directions considered, not built

Three other axes were sketched before Editorial Paper was picked: a Linear/Bloomberg-Terminal-precision direction (monospace-forward, hairline borders, near-zero motion), an Obsidian-graph-view/lab-instrument direction (phosphor glow, higher-chroma palette), and a Muji/Kinfolk field-notebook direction (deckle edges, sticky-note evidence badges). All three kept the same 3 fixed pillars and differed only in the same axes Editorial Paper differs on (type pairing, icon language, card texture, motion character). Not pursued further once Editorial Paper was confirmed by both Anay and Yash.

## Icons

**Lucide** (`lucide-react`), via the `Icon` wrapper in `components/ui/Icon.tsx`, always that wrapper, never a raw `lucide-react` import in a feature component. Fixed convention: 1.5px stroke, no fill, three sizes (`xs` 14px / `sm` 16px / `md` 20px) tied to the type scale rather than picked ad hoc per usage. Editorial Paper is restrained and non-decorative, so icons stay small, single-color (`currentColor`), and functional; never a colorful icon set, never an icon standing in for a label on its own without an `aria-label`.

## Prompts

Image-generation prompts for the brand kit and all 8 app surfaces live in `design/prompts/`. The canonical brand-assets prompt is `design/prompts/brand.md`.

## Real generated assets

**Regenerated 2026-08-13**: the original 2026-08-11 kit's glyph didn't read as its intended "open book + quill" even at 1024px and collapsed to an illegible blob at favicon size. New kit lives in `design/brand/PEPIROS-BRAND/` (`app-icons/`, `favicon/`, `glyph/{monochrome,png,svg,transparent}/`, `logos/{monochrome,primary,reversed,stacked,wordmark}/`, `social/`), sourced from `Pepiros brand asset kit.zip` in the same folder. SVG-based (glyph + logo lockups), not PNG-only like the original: scales cleanly at any size instead of needing per-size crops. The wordmark lockup typography carried over unchanged (it was already good); only the glyph mark changed.

`app/icon.png`, `app/apple-icon.png` updated from `favicon/favicon-512.png` and `app-icons/apple-touch-icon-180.png`. `app/favicon.ico` rebuilt as a proper multi-resolution ICO (16/32/48px) from the kit's individual PNG sizes; the kit's own `favicon.ico` only embeds a single 48px image, which is a regression for crisp small-size rendering. `components/ui/Logo.tsx` now imports the new SVGs directly; a `pepiros-wordmark-only-reversed.svg` was generated (fill swapped to `--ink` `#e8e6e1`) since the kit only shipped a single dark-ink wordmark, no reversed pair.

**`social/og-1200x630.png` and `social/twitter-1600x900.png` are wired in** as static `app/opengraph-image.png` / `app/twitter-image.png`, replacing the old `app/opengraph-image.tsx` code-generated version (which used an even older hand-coded SVG glyph, predating both brand kits, plus a fallback font instead of Source Serif 4). Confirmed the new OG image does **not** repeat the old "Verified" badge problem: no claim is ever labelled verified, only "quote located," per `docs/PLAN-V1.md §4`.

**Note:** the OG image's tagline reads "Be the source.", different from the tagline still live in the site's H1 ("Every claim, one click from its source."). Not reconciled yet; a deliberate decision, not an oversight, left for Anay/Yash to resolve. The kit also has no grain/texture asset (the original kit's `paper-grain.png`, still live and unreplaced, continues backing `.surface-reading`'s tiled texture in `app/globals.css`) and no email-signature/palette-reference-sheet equivalents; flag if those are still needed.
