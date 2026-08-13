import { useId } from "react";
import clsx from "clsx";
import Image from "next/image";
import wordmarkDark from "@/design/brand/PEPIROS-BRAND/logos/wordmark/pepiros-wordmark-only.svg";
import wordmarkReversed from "@/design/brand/PEPIROS-BRAND/logos/wordmark/pepiros-wordmark-only-reversed.svg";

/**
 * Icon mark: a pin/anchor silhouette with a quote-mark cutout ("grounded" +
 * "quoted"), from design/brand/PEPIROS-ANCHOR-MARK/svg/pepiros-mark.svg
 * (2026-08-13, replacing the earlier document/clip glyph -- that one read
 * as generic clip-art and went illegible below ~24px even in the kit's own
 * small exports, which is what forced a separate simplified small-size
 * component before this). This mark is one flat path with a mask cutout,
 * designed to hold up from favicon (16px) to watermark (224px+) scale, so
 * unlike before there's no large/small split: one component, sized via
 * `className`. Inlined rather than loaded as an `<Image>` so it stays
 * crisp at every size without a raster export per size.
 *
 * No reversed/white SVG shipped in the kit -- only the single dark-ink
 * (#0b0c0e) source -- so `variant="chrome"` is generated here as a
 * straight fill-color swap to `--ink` (#e8e6e1), the same pattern already
 * used below for the wordmark's missing reversed variant.
 *
 * `useId()` backs the mask id: this renders at least twice per page
 * (header + footer), so a hardcoded id would collide.
 */
export function LogoMark({
  variant = "paper",
  className,
}: {
  variant?: "chrome" | "paper";
  className?: string;
}) {
  const maskId = `pepiros-mark-quote-${useId()}`;
  const fill = variant === "chrome" ? "#e8e6e1" : "#0b0c0e";
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      className={clsx("h-6 w-auto", className)}
    >
      <mask id={maskId}>
        <rect width="240" height="240" fill="white" />
        <rect
          x="98"
          y="56"
          width="16"
          height="44"
          rx="8"
          fill="black"
          transform="rotate(-18 106 78)"
        />
        <rect
          x="126"
          y="56"
          width="16"
          height="44"
          rx="8"
          fill="black"
          transform="rotate(18 134 78)"
        />
      </mask>
      <path
        d="M120,20 C81.4,20 50,51.4 50,90 C50,142.5 120,220 120,220 C120,220 190,142.5 190,90 C190,51.4 158.6,20 120,20 Z"
        fill={fill}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

/**
 * Full lockup, nav/footer scale: `LogoMark` beside the wordmark-only
 * asset, composed here rather than using the canonical logo lockup exports
 * directly -- those bake the tagline into the same canvas as the glyph and
 * wordmark, so it can't be shown/hidden independently and would either
 * duplicate or fight the `tagline` prop below. `variant="chrome"` (default)
 * is light ink for the app's dark chrome; `variant="paper"` is dark ink for
 * a paper reading surface -- the mark and the wordmark switch together.
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
      <div className="flex items-center gap-1.5">
        <LogoMark variant={variant} className="h-4 w-auto shrink-0" />
        <Image
          src={wordmark}
          alt="Pepiros"
          priority
          className="h-4 w-auto object-contain"
        />
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
