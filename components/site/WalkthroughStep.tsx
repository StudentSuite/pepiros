import clsx from "clsx";

/**
 * One step in a numbered walkthrough: index circle, optional kicker, title,
 * prose, optional media slot. Shared by /how-it-works (media-led, alternating
 * two-column) and /how-to-use (a prose-only list before this) so a step
 * never looks different depending on which page describes it (issue #298).
 *
 * Alternates plain surface tones between consecutive steps for rhythm
 * (`tone="raised"` washes in a faint `bg-surface-sunken/40`) rather than the
 * shader `<Band>` on every step -- design/anti-slop.md caps the shader at two
 * bands per page, and a 4-7 step walkthrough would blow past that if each
 * step were a Band. The "alternating light and dark" the plan asks for is
 * this surface-tone alternation, not the mesh shader repeated per step.
 */
export function WalkthroughStep({
  index,
  kicker,
  title,
  children,
  media,
  flip = false,
  tone = "plain",
}: {
  index: number;
  kicker?: string;
  title: string;
  children: React.ReactNode;
  media?: React.ReactNode;
  flip?: boolean;
  tone?: "plain" | "raised";
}) {
  return (
    <section className={clsx("border-t border-border", tone === "raised" && "bg-surface-sunken/40")}>
      <div
        className={clsx(
          "mx-auto grid w-full items-center gap-s-7 p-s-5",
          media ? "max-w-6xl lg:grid-cols-2" : "max-w-3xl",
        )}
      >
        <div className={flip && media ? "lg:order-2" : undefined}>
          <div className="flex items-center gap-s-3">
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full border border-border font-mono text-[11px] text-ink-faint"
            >
              {index}
            </span>
            {kicker && (
              <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">{kicker}</p>
            )}
          </div>
          <h2 className="mt-s-4 font-sans font-semibold text-2xl leading-snug text-ink sm:text-3xl">
            {title}
          </h2>
          <div className="mt-s-4 flex flex-col gap-s-3 font-sans text-base leading-relaxed text-ink-muted">
            {children}
          </div>
        </div>
        {media && <div className={flip ? "lg:order-1" : undefined}>{media}</div>}
      </div>
    </section>
  );
}
