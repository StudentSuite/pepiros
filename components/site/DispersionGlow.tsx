import { MESH_DRIFT_PALETTE_HEX } from "@/components/chrome/mesh-drift.frag";

/**
 * A soft, blurred colour wash behind a section heading -- the cheapest real
 * way to carry the shader's own material language into the plain light/dark
 * sections between shader bands, without building the full authored chrome
 * layer (§3, still flagged as follow-up work). Not a substitute for that
 * layer: it is one blurred radial gradient, not refractive glass or RGB
 * fringing. It exists so those sections read as part of the same material
 * system instead of generic bordered boxes, which is the gap between what
 * shipped and the plan's own visual intent.
 *
 * Issue #338: after #335 the bookend bands went from a warm amber/green/
 * violet ramp to a high-chroma neon one (near-black ground, electric green,
 * orange, purple -- MESH_DRIFT_PALETTE_HEX), so a mid-page glow still keyed
 * to the old --disp-* tokens no longer matched the sections it sits between.
 * Pointed at the shader's own exported hex stops instead of the retired
 * tokens, so it can't drift from the ramp a second time -- one array, not
 * a hand-kept copy of it.
 *
 * Purely decorative (aria-hidden), absolutely positioned behind its
 * section's content, and never a fill any interactive element sits on --
 * this is atmosphere, not a swatch.
 */
const TONE_HEX = {
  // Warm-hued call sites: the new ramp has no amber stop, orange is its
  // closest warm hue.
  amber: MESH_DRIFT_PALETTE_HEX[2],
  green: MESH_DRIFT_PALETTE_HEX[1],
  // "violet" kept as the prop name (existing call sites), pointed at the
  // ramp's purple stop -- the closest cool hue to what it replaces.
  violet: MESH_DRIFT_PALETTE_HEX[3],
} as const;

export function DispersionGlow({
  tone = "amber",
  className = "",
  /**
   * Default matches every existing usage. Exposed (not just another
   * Tailwind class in `className`) because a second `opacity-[…]` utility
   * appended after this component's own would collide with it at equal
   * specificity -- which one wins depends on Tailwind's generated
   * stylesheet order, not the order in the class string, so overriding it
   * that way is unreliable. An inline style always wins cleanly.
   */
  opacity = 0.15,
}: {
  tone?: "amber" | "green" | "violet";
  className?: string;
  opacity?: number;
}) {
  const color = TONE_HEX[tone];
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -z-10 h-64 w-64 rounded-full blur-3xl ${className}`}
      style={{ background: color, opacity }}
    />
  );
}
