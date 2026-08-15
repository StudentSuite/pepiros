import clsx from "clsx";
import Image from "next/image";
import glyphInkDark from "@/design/PEPIROS-BRAND/glyph/monochrome/glyph-mono-dark.svg";
import glyphInkLight from "@/design/PEPIROS-BRAND/glyph/monochrome/glyph-mono-light.svg";

/**
 * Brand marks, sourced from design/PEPIROS-BRAND (the 2026-08-14 kit, which
 * replaced design/brand entirely).
 *
 * A note on the kit's filenames, because they read backwards at first glance:
 * `-dark` means dark INK (#16181B), i.e. the mark for a LIGHT surface, and
 * `-light` means light ink (#FAF8F4), the mark for a DARK surface. So the day
 * theme uses the `-dark` files.
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
 * THEME HANDLING for the glyph: both ink variants render and CSS picks one,
 * rather than selecting a `src` from `useTheme()`. The server does not know
 * the theme, so a conditional render is a guaranteed hydration mismatch.
 * `dark:` variants work because next-themes sets the `dark` class on <html>
 * and tailwind.config.ts runs `darkMode: ["class"]`.
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

/** Which ink variants to render for a given surface. */
function inkPlan(variant: LogoVariant) {
  return {
    darkInk: variant === "auto" ? "dark:hidden" : variant === "paper" ? "" : "hidden",
    lightInk:
      variant === "auto" ? "hidden dark:block" : variant === "chrome" ? "" : "hidden",
  };
}

/**
 * Icon-only mark.
 *
 * The kit also ships glyph/svg/glyph-simple-small.svg, a 3-heavy-line variant
 * for sizes below ~24px where the 6-line mark fills in. It is not wired here
 * because every in-app render is >= 28px; the favicon and app-icon sizes come
 * from the kit's own pre-rendered PNG/ICO exports.
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
  const ink = inkPlan(variant);
  const base = clsx(GLYPH_SIZE[size], "w-auto object-contain");
  return (
    <>
      <Image
        src={glyphInkDark}
        alt=""
        aria-hidden="true"
        className={clsx(base, ink.darkInk, className)}
      />
      <Image
        src={glyphInkLight}
        alt=""
        aria-hidden="true"
        className={clsx(base, ink.lightInk, className)}
      />
    </>
  );
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
  className,
}: {
  tagline?: boolean;
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-2.5">
        <LogoMark variant={variant} size={size} />
        <span
          className={clsx(
            "font-serif uppercase leading-none",
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
