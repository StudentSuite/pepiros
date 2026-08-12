import clsx from "clsx";
import Image from "next/image";
import glyphMark from "@/design/brand/glyph-mark.png";
import logoLockupPrimary from "@/design/brand/logo-lockup-primary.png";
import logoLockupReversed from "@/design/brand/logo-lockup-reversed.png";

/**
 * Icon-only mark, from the real generated brand asset
 * (design/brand/glyph-mark.png, run from design/prompts/brand.md) -- not a
 * hand-coded SVG approximation. Square source (800x800), so height and
 * width should stay equal at any call site.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={glyphMark}
      alt=""
      aria-hidden="true"
      className={clsx("h-5 w-5 object-contain", className)}
    />
  );
}

/**
 * Full wordmark lockup, from the real generated brand assets
 * (design/brand/logo-lockup-{primary,reversed}.png). `variant="chrome"`
 * (default) is the reversed (light-ink) lockup for the app's dark chrome;
 * `variant="paper"` is the primary (dark-ink) lockup for when the logo sits
 * on a paper reading surface instead. Both source images are 2400x800 (3:1)
 * with a transparent background, so they composite cleanly over either
 * surface -- height-constrained, width follows via `w-auto`.
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
  const lockup = variant === "chrome" ? logoLockupReversed : logoLockupPrimary;
  return (
    <div className={clsx("flex flex-col", className)}>
      <Image src={lockup} alt="Pepiros" priority className="h-5 w-auto object-contain" />
      {tagline && (
        <span
          className={clsx(
            "mt-1.5 font-mono text-[10px] uppercase tracking-widest",
            variant === "chrome" ? "text-ink-faint" : "text-[#1c1a15]/60",
          )}
        >
          Every claim, one click from its source
        </span>
      )}
    </div>
  );
}
