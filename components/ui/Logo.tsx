import clsx from "clsx";

import { cn } from "@/lib/utils";

/**
 * Brand marks, sourced from design/PEPIROS-BRAND (the 2026-08-14 kit, which
 * replaced design/brand entirely).
 *
 * WHY THE WORDMARK IS NOT THE KIT'S SVG. The kit ships wordmark-{dark,light}
 * .svg, each a single <text> element in 'Source Serif 4'. Rendered through
 * next/image those land in an <img>, and an SVG in an <img> is an isolated
 * document: it cannot reach the page's @font-face, so 'Source Serif 4' never
 * resolves and it silently falls back to Georgia. It also carries ~43% dead
 * trailing whitespace and puts the cap height at only ~27% of the viewBox,
 * which is why it rendered small next to the glyph.
 *
 * Typesetting it as real HTML text fixes all of that at once: the actual brand
 * face (via --font-serif, already loaded by next/font), exact optical sizing,
 * no dead space, colour straight from the theme token, and one fewer asset
 * pair to keep in sync. Tracking is carried over from the kit verbatim
 * (letter-spacing 18 at font-size 62 = 0.29em).
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
 * The pair is tuned to hold one ratio, glyph height at ~1.4x the wordmark's
 * font-size, so the lockup reads the same at every size. It used to run ~1.9x,
 * which made the mark loom over its own type; the reference lockup sits nearer
 * 1.4 and the wordmark is what carries the brand.
 *
 * `sm` bottoms out at 28px deliberately. That is the size this glyph was cut
 * for (see the file header) and it is the floor: below it the page rules start
 * to composite and the mark goes back to reading as a speck.
 */
const GLYPH_SIZE: Record<LogoSize, string> = {
  sm: "h-7", // 28px -- site header, sidebar
  md: "h-[30px]", // footer, auth cards
  lg: "h-11", // 44px -- hero, onboarding
};

const WORDMARK_SIZE: Record<LogoSize, string> = {
  sm: "text-[19px]",
  md: "text-[21px]",
  lg: "text-[32px]",
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
  sm: "h-[32px]", // 19 + 3 + 10
  md: "h-[34px]", // 21 + 3 + 10
  lg: "h-[45px]", // 32 + 3 + 10
};

/** Ink colour per variant, shared by the glyph and the wordmark so the lockup never splits. */
const INK: Record<LogoVariant, string> = {
  paper: "text-[#1c1a15]",
  chrome: "text-[#faf8f4]",
  auto: "text-ink",
};

/**
 * Icon-only mark.
 *
 * Drawn in the kit's own 96x120 coordinate space so it stays interchangeable
 * with the asset files, but with weights re-cut for small rendering (see the
 * file header). Page and rules take `currentColor` from the variant, so the
 * mark inverts with the theme for free; only the located-quote bar is a fixed
 * brand hue (Dusk #6E6AA7), which holds its contrast on both grounds.
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
  return (
    <svg
      viewBox="0 0 96 120"
      // `cn`, not `clsx`: the lockup passes a taller height for the tagline
      // variant, and it has to beat GLYPH_SIZE rather than tie with it.
      className={cn(GLYPH_SIZE[size], "w-auto shrink-0", INK[variant], className)}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* the page */}
      <rect
        x="10"
        y="20"
        width="76"
        height="92"
        rx="3"
        stroke="currentColor"
        strokeWidth="6"
      />
      {/* two plain rules, the last one short: the ragged text block that makes
          this read as a page rather than an empty box */}
      <line x1="26" y1="52" x2="70" y2="52" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <line x1="26" y1="96" x2="55" y2="96" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      {/* the located quote */}
      <rect x="22" y="68" width="52" height="12" rx="3" fill="#6E6AA7" />
      {/* bookmark tab, solid: the kit's wire hook above it does not survive 28px */}
      <path d="M38 6 H58 L58 30 L48 23 L38 30 Z" fill="currentColor" />
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
            "font-serif uppercase leading-none",
            // kit spec: letter-spacing 18 at font-size 62
            "tracking-[0.29em]",
            WORDMARK_SIZE[size],
            // the trailing letter-space pushes the optical centre left; pull
            // the box back so the lockup sits balanced against the glyph
            "-mr-[0.29em]",
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
