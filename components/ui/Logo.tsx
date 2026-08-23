import clsx from "clsx";

import { cn } from "@/lib/utils";

/**
 * Brand marks, sourced from design/brand (the 2026-08-23 kit, which replaced
 * design/PEPIROS-BRAND entirely).
 *
 * THE WORDMARK IS GEIST NOW, NOT SOURCE SERIF 4. The kit is explicit that
 * Geist sets the wordmark and that Source Serif 4 is for long-form article
 * body copy ONLY, never the wordmark and never a heading. design/brand/logos/
 * wordmark.svg is the reference: Geist 700, uppercase, letter-spacing 6 at
 * font-size 40, which is 0.15em.
 *
 * WHY IT IS STILL NOT THE KIT'S SVG. Those files are a single <text> element
 * naming the family. Rendered through next/image they land in an <img>, and
 * an SVG in an <img> is an isolated document: it cannot reach the page's
 * @font-face, so the family never resolves and it silently falls back to
 * Arial. They also carry dead trailing whitespace in the viewBox.
 *
 * Typesetting it as real HTML text fixes all of that at once: the actual
 * brand face (via --font-grotesque, already loaded by next/font), exact
 * optical sizing, no dead space, colour straight from a token, and one fewer
 * asset pair to keep in sync.
 *
 * WHY THE GLYPH IS NOW INLINE SVG, NOT THE KIT RASTER. Every kit glyph
 * (glyph/pillars/*.svg, glyph/monochrome/*.svg, and the android-foreground
 * PNG derived from them) draws six 3px rules inside a 94-unit-tall page. At
 * the nav's h-7 that page is 28px, so those rules land ~0.9px apart and
 * composite into one dark block: the mark reads as a speck, which is the
 * illegibility the 2026-08-13 critique logged and the reason Logo shipped
 * wordmark-first in the first place. Rather than shrink a large-size mark
 * again, this is a small-size cut of the same silhouette -- same page, same
 * bookmark tab, three rules instead of six at more than double the stroke
 * weight, and the hairline tab hook dropped because it cannot survive 28px.
 *
 * The middle rule is drawn as a filled accent bar rather than a stroke. That
 * is the product in the mark: a page with one sentence located on it. It also
 * does the work of making the glyph read as a logo instead of a generic
 * document icon at a glance, which the flat single-colour raster never did.
 */
type LogoVariant = "auto" | "chrome" | "paper";
type LogoSize = "sm" | "md" | "lg";

/**
 * Glyph height, and the wordmark it is sized against.
 *
 * The pair holds one ratio so the lockup reads the same at every size, and
 * that ratio is now taken from the kit rather than estimated:
 * design/brand/logos/horizontal.svg draws the glyph at scale 0.37 of its
 * 120-unit box (44.4px) beside a 40px wordmark, so glyph height is ~1.11x the
 * wordmark's font-size. The previous ~1.4x was tuned against the old Source
 * Serif 4 wordmark, whose caps are visually smaller than Geist's at the same
 * px; carrying it over would have left the mark looming over its own type.
 *
 * `sm` bottoms out at 28px deliberately. That is the size this glyph was cut
 * for (see the file header) and it is the floor: below it the page rules start
 * to composite and the mark goes back to reading as a speck.
 *
 * BUMPED ~14% ABOVE THE KIT'S 1.11x RATIO, 2026-08-23. The glyph's own
 * viewBox carries real internal margin (content spans roughly y=3 to
 * y=112 of a 118-tall box), so at exactly 1.11x the rendered ink read
 * smaller than the wordmark's cap-height beside it despite the box
 * technically being taller. WORDMARK_SIZE below is deliberately left at
 * the kit's own values -- only the glyph grows, which is what pushes the
 * mark to visibly read as bigger than its wordmark rather than merely
 * equal to it.
 */
const GLYPH_SIZE: Record<LogoSize, string> = {
  sm: "h-8", // 32px -- site header, sidebar
  md: "h-[34px]", // footer, auth cards
  lg: "h-[50px]", // hero, onboarding
};

const WORDMARK_SIZE: Record<LogoSize, string> = {
  sm: "text-[25px]", // 28 / 1.11
  md: "text-[27px]", // 30 / 1.11
  lg: "text-[40px]", // 44 / 1.11, the kit's own figure
};

/**
 * Glyph height when the tagline is showing.
 *
 * With the tagline the mark flanks a two-line stack rather than sitting beside
 * the wordmark alone, so it grows to span both lines and hold the left edge of
 * the lockup. Each value is the stack it has to match: WORDMARK_SIZE + the
 * column's 3px gap + the tagline's 10px, all set `leading-none` below so the
 * arithmetic is the rendered height and not an approximation of it.
 */
const TAGLINE_GLYPH_SIZE: Record<LogoSize, string> = {
  sm: "h-[38px]", // 25 + 3 + 10
  md: "h-[40px]", // 27 + 3 + 10
  lg: "h-[53px]", // 40 + 3 + 10
};

/**
 * Ink colour per variant, shared by the glyph and the wordmark so the lockup
 * never splits.
 *
 * `paper` and `chrome` are the kit's flat-ink and reversed treatments and are
 * deliberately THEME-INVARIANT: which one you want is decided by the ground
 * the lockup is being placed on, not by the reader's colour scheme. `auto` is
 * the theme-aware default and is what nearly every call site should use.
 */
const INK: Record<LogoVariant, string> = {
  paper: "text-brand-ink",
  chrome: "text-brand-ink-reversed",
  auto: "text-ink",
};

/**
 * Icon-only mark: the research paper and its binder clip.
 *
 * THIS IS THE KIT GEOMETRY, VERBATIM. Every coordinate below is copied from
 * design/brand/glyph/glyph-source.svg, which design/brand/README.txt names as
 * the source of truth that every other asset in the kit is a rendering of:
 *
 *   sheet   rect x=12 y=18 w=72 h=94 rx=2.5
 *   rules   y = 46, 57, 68, 79, 90 (x 22-74) + a short rule y=101 (x 22-52),
 *           stroke-width 3, round caps
 *   clip    M39 15.5 H57 L59.5 33.5 H36.5 Z
 *   handle  M43 16 C43 6.5 45.2 3.4 48 3.4 C50.8 3.4 53 6.5 53 16,
 *           stroke-width 2.4, round caps, fill none
 *
 * It replaces a hand-cut three-rule simplification that was drawn for small
 * sizes. The kit is the mark; a second, different mark that only this file
 * knew about is how a brand ends up with two logos.
 *
 * WHY IT IS INLINE RATHER THAN <img src="glyph.svg">. An SVG loaded through
 * <img> is an isolated document: it cannot inherit a token, cannot respond to
 * the theme, and cannot be recoloured per placement. Inlining keeps one asset
 * to reason about and lets the treatments below be real.
 *
 * THEME BEHAVIOUR. A sheet of paper is a physical object, so it does not
 * invert with the reader's colour scheme: the page stays light and the ruling
 * stays dark in both themes, exactly as the kit's own og/ and social/ renders
 * place it on a dark ground. That is what the kit means by "flat ink".
 *
 * LEGIBILITY NOTE, worth knowing before shrinking it further. Six 3-unit rules
 * inside a 94-unit page means that at the header's 28px they land under a
 * pixel apart and start to composite into a grey block. It holds at 28px and
 * up; below that the rules should thin out rather than the whole mark being
 * scaled down.
 */
export function LogoMark({
  variant = "auto",
  size = "sm",
  className,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}) {
  // The kit's own values, not theme tokens: see THEME BEHAVIOUR above.
  const SHEET = "var(--brand-ink-reversed)";
  const RULE = "var(--brand-ink)";
  // The clip's wire handle is the one warm accent in the mark.
  const HANDLE = "#8A8374";

  return (
    <svg
      viewBox="0 0 96 118"
      // `cn`, not `clsx`: the lockup passes a taller height for the tagline
      // variant, and it has to beat GLYPH_SIZE rather than tie with it.
      className={cn(GLYPH_SIZE[size], "w-auto shrink-0", INK[variant], className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="12"
        y="18"
        width="72"
        height="94"
        rx="2.5"
        fill={SHEET}
        stroke={RULE}
        strokeWidth="1.6"
      />
      {[46, 57, 68, 79, 90].map((y) => (
        <line
          key={y}
          x1="22"
          y1={y}
          x2="74"
          y2={y}
          stroke={RULE}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      {/* the short last rule: the ragged edge that makes this read as text */}
      <line x1="22" y1="101" x2="52" y2="101" stroke={RULE} strokeWidth="3" strokeLinecap="round" />
      {/* binder clip body, then its wire handle */}
      <path d="M39 15.5 H57 L59.5 33.5 H36.5 Z" fill={RULE} />
      <path
        d="M43 16 C43 6.5 45.2 3.4 48 3.4 C50.8 3.4 53 6.5 53 16"
        fill="none"
        stroke={HANDLE}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full lockup: glyph beside wordmark, composed here rather than using the
 * kit's baked primary/stacked lockups, because those bake the tagline onto the
 * same canvas and it could not then be shown or hidden independently.
 *
 * The glyph holds the left edge and the type stacks to its right, so with the
 * tagline on, "Be the source." sits directly under the wordmark and shares its
 * left edge instead of sitting under the whole row and starting back at the
 * glyph. Both faces begin flush left despite their tracking, because
 * letter-spacing is applied after each character rather than before it.
 */
export function Logo({
  tagline = false,
  variant = "auto",
  size = "sm",
  /**
   * Drop to the glyph alone below `sm`. The wordmark's brand tracking makes it
   * ~90px wide even at nav size, which is enough to push a narrow header past
   * the viewport once the auth buttons and theme toggle are alongside it.
   */
  collapseWordmark = false,
  className,
}: {
  tagline?: boolean;
  variant?: LogoVariant;
  size?: LogoSize;
  collapseWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <LogoMark
        variant={variant}
        size={size}
        className={tagline ? TAGLINE_GLYPH_SIZE[size] : undefined}
      />
      {/* The collapse hides the whole type column, not just the wordmark: left
          on the wordmark alone it would empty the column to zero width and the
          row's gap would still bill 10px of dead space beside the glyph. */}
      <div
        className={clsx(
          "flex flex-col gap-[3px]",
          collapseWordmark && "hidden sm:flex",
        )}
      >
        <span
          className={clsx(
            // Geist, per the kit. `font-serif` here would be a brand
            // violation, not just a style choice.
            "font-sans font-bold uppercase leading-none",
            // kit spec: letter-spacing 6 at font-size 40
            "tracking-[0.15em]",
            WORDMARK_SIZE[size],
            // the trailing letter-space pushes the optical centre left; pull
            // the box back so the lockup sits balanced against the glyph
            "-mr-[0.15em]",
            INK[variant],
          )}
        >
          Pepiros
        </span>
        {tagline && (
          <span className="font-mono text-[10px] uppercase leading-none tracking-widest text-ink-faint">
            Be the source.
          </span>
        )}
      </div>
    </div>
  );
}
