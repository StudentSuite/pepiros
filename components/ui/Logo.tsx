import clsx from "clsx";
import Image from "next/image";
import glyphMarkDark from "@/design/brand/PEPIROS-BRAND/glyph/monochrome/pepiros-glyph-mono-black.svg";
import glyphMarkReversed from "@/design/brand/PEPIROS-BRAND/glyph/monochrome/pepiros-glyph-mono-white.svg";
import wordmarkDark from "@/design/brand/PEPIROS-BRAND/logos/wordmark/pepiros-wordmark-only.svg";
import wordmarkReversed from "@/design/brand/PEPIROS-BRAND/logos/wordmark/pepiros-wordmark-only-reversed.svg";

/**
 * Icon-only mark, from the regenerated brand kit (2026-08-13, replacing the
 * original glyph -- the old one didn't read as its intended "book + quill"
 * even at 1024px and collapsed to an illegible blob at favicon size). SVG
 * source, so unlike the old PNG export there's no per-size crop to maintain:
 * it scales cleanly at any render height. `variant="paper"` (default) is
 * the dark-ink mark for a light/paper surface; `variant="chrome"` is the
 * white mono variant for the app's dark chrome.
 *
 * `pepiros-wordmark-only-reversed.svg` (chrome ink) doesn't exist in the
 * kit -- only a single dark-ink wordmark shipped -- so it's generated here
 * as a straight fill-color swap to `--ink` (#e8e6e1, the app's actual
 * chrome-ink token), not an approximation.
 */
export function LogoMark({
  variant = "paper",
  className,
}: {
  variant?: "chrome" | "paper";
  className?: string;
}) {
  return (
    <Image
      src={variant === "chrome" ? glyphMarkReversed : glyphMarkDark}
      alt=""
      aria-hidden="true"
      className={clsx("h-6 w-auto object-contain", className)}
    />
  );
}

/**
 * Full wordmark lockup: the glyph mark beside the wordmark-only asset,
 * composed here rather than using the canonical logo lockup exports
 * directly -- those bake the tagline into the same canvas as the glyph and
 * wordmark, so it can't be shown/hidden independently and would either
 * duplicate or fight the `tagline` prop below. `variant="chrome"` (default)
 * is light ink for the app's dark chrome; `variant="paper"` is dark ink for
 * a paper reading surface -- both the glyph and the wordmark switch
 * together.
 */
export function Logo({
  tagline = false,
  variant = "chrome",
  className,
}: {
  tagline?: boolean;
  variant?: "chrome" | "paper";
  className?: string;
}) {
  const wordmark = variant === "chrome" ? wordmarkReversed : wordmarkDark;
  return (
    <div className={clsx("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-2">
        <LogoMark variant={variant} />
        <Image src={wordmark} alt="Pepiros" priority className="h-3.5 w-auto object-contain" />
      </div>
      {tagline && (
        <span
          className={clsx(
            "font-mono text-[10px] uppercase tracking-widest",
            variant === "chrome" ? "text-ink-faint" : "text-[#1c1a15]/60",
          )}
        >
          Every claim, one click from its source
        </span>
      )}
    </div>
  );
}
