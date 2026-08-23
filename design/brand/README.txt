PEPIROS BRAND KIT
=================

SOURCE OF TRUTH
  brand/glyph/glyph-source.svg holds the canonical glyph geometry (research
  paper + binder clip). Every other file in this kit is a rendering of that
  same geometry -- proportions are never redrawn or reinterpreted.

  Canonical geometry:
    sheet   rect x=12 y=18 w=72 h=94 rx=2.5
    rules   y = 46, 57, 68, 79, 90 (x 22-74) + short rule y=101 (x 22-52),
            stroke-width 3, round caps
    clip    M39 15.5 H57 L59.5 33.5 H36.5 Z
    handle  M43 16 C43 6.5 45.2 3.4 48 3.4 C50.8 3.4 53 6.5 53 16,
            stroke-width 2.2, round caps, fill none

TREATMENTS
  flat-ink    restrained single-ink mark for product UI
  chrome      refractive gradient + dispersion drop-shadows, for marketing
  reversed    flat-ink cut for placement on dark chrome
  monochrome  single-color outline variant (no fill)
  Never mix treatments within one lockup.

TYPOGRAPHY
  Geist        UI, headlines, wordmark, navigation, buttons
  Geist Mono   citation IDs, technical metadata, scores
  Source Serif 4   long-form article/paper body copy ONLY -- never the
                   wordmark, never headlines

COLOR PHILOSOPHY
  Purple/lavender is the ENVIRONMENT the material refracts through, not a
  brand swatch. There is no purple button, no purple card, no purple CTA
  anywhere in this kit. The dispersion palette (bone, amber, green, violet)
  appears only as thin fringe/glow accents on glass material.
  --logo-quote-bar (#6E6AA7) is kept as one isolated token -- the small
  accent bar under the wordmark in brand/og and brand/social renders is
  the only place that exact value is used, by design, so it can move in
  one place later.

TAGLINE
  "Be the source." -- verbatim, exact punctuation, no em dashes.

EVIDENCE LANGUAGE
  "quote located" for deterministic evidence. "inference" for
  model-generated reasoning. The word "verified" never appears in any
  asset, label, or generated copy in this kit.

FOLDERS
  glyph/      source SVG + 5 treatment SVGs + PNG 64-1024px
  logos/      horizontal, stacked, wordmark, wordmark+tagline, reversed,
              monochrome lockups
  favicon/    16-512px PNGs, favicon.ico (16/32/48 multi-res), pinned tab
  app-icons/  android 192/512, maskable 512, foreground 512, apple touch
              180, mstile 150
  og/         1200x630 Open Graph card
  social/     avatar 800, twitter, linkedin, github, discord cards
  posters/    ChromeField campaign frames -- material study, not screenshots
  web/        browserconfig.xml, manifest icon/color snippet (fixes the old
              #0d0e11/#14161a values, which matched no token in this system)

REGENERATING
  This kit was produced by a single script that reads glyph-source.svg's
  geometry and composes every derived asset from it -- no file here was
  hand-edited independently. When the geometry or palette changes, rerun
  the generator rather than patching individual PNGs.

NOTE ON RASTER RENDERS
  og/, social/, and posters/ are systemized CSS/canvas approximations of the
  refractive-glass material language (dispersion fringe, thin-film
  iridescence, heavy grain, matte finish). They establish the visual
  direction; a photographed or 3D-rendered pass can replace them later
  without changing any layout, token, or generator contract.
