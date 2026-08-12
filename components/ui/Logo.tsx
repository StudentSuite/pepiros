import clsx from "clsx";
import Image from "next/image";
import glyphMarkDark from "@/design/brand/ui/glyph-mark.png";
import glyphMarkReversed from "@/design/brand/ui/glyph-mark-reversed.png";
import wordmarkDark from "@/design/brand/ui/wordmark-only-dark.png";
import wordmarkReversed from "@/design/brand/ui/wordmark-only-reversed.png";

/**
 * Icon-only mark. Source content is design/brand/glyph-mark.png (run from
 * design/prompts/brand.md), but that canonical export sits on an 800x800
 * canvas with the visible glyph occupying only a small centered region
 * (safe-area padding meant for print/template use, not UI icon scale) --
 * at any small render size the mark all but disappears. design/brand/ui/
 * holds a tight crop of the same pixels (~6% padding around the actual
 * ink, nothing redrawn or replaced). The true glyph is ~1.2:1 (wider than
 * tall, not square) -- w-auto follows the real aspect rather than forcing
 * a square box.
 *
 * The export only shipped the glyph in dark ink -- unlike the wordmark,
 * which came as a matched dark/reversed pair. `variant="paper"` (default)
 * uses that dark-ink original as-is; `variant="chrome"` uses
 * glyph-mark-reversed.png, generated once from the same source alpha mask
 * recolored to the wordmark's exact reversed ink tone (#f5f1e8-ish, not a
 * flat invert) so the icon and wordmark match on dark chrome.
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
      className={clsx("h-5 w-auto object-contain", className)}
    />
  );
}

/**
 * Full wordmark lockup: the cropped glyph mark beside a cropped
 * wordmark-only asset, composed here rather than using the canonical
 * design/brand/logo-lockup-{primary,reversed}.png exports directly --
 * those bake the tagline into the same canvas as the glyph and wordmark,
 * so it can't be shown/hidden independently and would either duplicate or
 * fight the `tagline` prop below. wordmark-only-{dark,reversed}.png has
 * no tagline baked in, same crop-in-design/brand/ui/ story as LogoMark
 * (canonical exports are 1600x400 with the word occupying a small
 * centered ~500x73 region). `variant="chrome"` (default) is light ink for
 * the app's dark chrome; `variant="paper"` is dark ink for a paper
 * reading surface -- both the glyph and the wordmark switch together.
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
