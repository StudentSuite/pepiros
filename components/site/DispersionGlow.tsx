/**
 * A soft, blurred colour wash behind a section heading -- the cheapest real
 * way to carry the dispersion material language (§1's amber/green/violet
 * fringe) into the plain light/dark sections between shader bands, without
 * building the full authored chrome layer (§3, still flagged as follow-up
 * work). Not a substitute for that layer: it is one blurred radial gradient,
 * not refractive glass or RGB fringing. It exists so those sections read as
 * part of the same material system instead of generic bordered boxes, which
 * is the gap between what shipped and the plan's own visual intent.
 *
 * Purely decorative (aria-hidden), absolutely positioned behind its
 * section's content, and never a fill any interactive element sits on --
 * the purple rule still holds: this is atmosphere, not a swatch.
 */
export function DispersionGlow({
  tone = "amber",
  className = "",
}: {
  tone?: "amber" | "green" | "violet";
  className?: string;
}) {
  const color = `var(--disp-${tone})`;
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 h-64 w-64 rounded-full opacity-[0.15] blur-3xl ${className}`}
      style={{ background: color }}
    />
  );
}
