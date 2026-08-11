import clsx from "clsx";

/**
 * Editorial Paper wordmark + glyph (open book + quill), the same line-art
 * mark used in app/icon.svg, app/apple-icon.tsx, and app/opengraph-image.tsx
 * -- keep those four in sync if the glyph ever changes.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx("h-5 w-5", className)}
      aria-hidden="true"
    >
      <path d="M2 5.5c2.8-1 6.2-1 9 .5v13c-2.8-1.5-6.2-1.5-9-.5V5.5Z" />
      <path d="M22 5.5c-2.8-1-6.2-1-9 .5v13c2.8-1.5 6.2-1.5 9-.5V5.5Z" />
      <path d="M13.5 8.5 21 2" />
      <path d="M19.4 2.3 21 2l-.3 1.6" />
    </svg>
  );
}

/**
 * Full wordmark lockup. `variant="chrome"` (default) is light ink for the
 * app's dark chrome; `variant="paper"` is dark ink for when the logo sits
 * on a paper reading surface instead.
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
  return (
    <div
      className={clsx(
        "flex items-center gap-2",
        variant === "chrome" ? "text-ink" : "text-[#1c1a15]",
        className,
      )}
    >
      <LogoMark />
      <div className="flex flex-col leading-none">
        <span className="font-serif text-sm font-semibold uppercase tracking-[0.2em]">
          Pepiros
        </span>
        {tagline && (
          <span className="mt-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            Every claim, one click from its source
          </span>
        )}
      </div>
    </div>
  );
}
