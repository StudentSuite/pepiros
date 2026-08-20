import clsx from "clsx";
import Image from "next/image";
import androidGlyph from "@/design/PEPIROS-BRAND/app-icons/android-foreground-512-trimmed.png";

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
 * GLYPH: android-foreground-512.png (the Android adaptive-icon foreground
 * layer) trimmed to its opaque bounds -- source ships on a 512x512 canvas
 * with a huge transparent safe-zone margin, so used untrimmed it renders as
 * a near-invisible speck at nav/footer sizes. It's a flat raster (not an ink
 * pair), so unlike the old kit glyph it does not swap per theme.
 */
type LogoVariant = "auto" | "chrome" | "paper";
type LogoSize = "sm" | "md" | "lg";

const GLYPH_SIZE: Record<LogoSize, string> = {
  sm: "h-7", // 28px -- site header
  md: "h-8", // 32px -- footer, auth cards
  lg: "h-12", // 48px -- hero, onboarding
};

const WORDMARK_SIZE: Record<LogoSize, string> = {
  sm: "text-[15px]",
  md: "text-[18px]",
  lg: "text-[28px]",
};

/**
 * Icon-only mark.
 */
export function LogoMark({
  size = "sm",
  className,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}) {
  const base = clsx(GLYPH_SIZE[size], "w-auto object-contain");
  return <Image src={androidGlyph} alt="" aria-hidden="true" className={clsx(base, className)} />;
}

/**
 * Full lockup: glyph beside wordmark, composed here rather than using the
 * kit's baked primary/stacked lockups, because those bake the tagline onto the
 * same canvas and it could not then be shown or hidden independently.
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
    <div className={clsx("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2.5">
        <LogoMark variant={variant} size={size} />
        <span
          className={clsx(
            "font-serif uppercase leading-none",
            collapseWordmark && "hidden sm:inline",
            // kit spec: letter-spacing 18 at font-size 62
            "tracking-[0.29em]",
            WORDMARK_SIZE[size],
            // the trailing letter-space pushes the optical centre left; pull
            // the box back so the lockup sits balanced against the glyph
            "-mr-[0.29em]",
            variant === "paper"
              ? "text-[#1c1a15]"
              : variant === "chrome"
                ? "text-[#faf8f4]"
                : "text-ink",
          )}
        >
          Pepiros
        </span>
      </div>
      {tagline && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          Be the source.
        </span>
      )}
    </div>
  );
}
