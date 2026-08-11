/**
 * Motion foundation (docs/PLAN-V1.md §14.3). CSS-native rather than a
 * physics library on purpose: Editorial Paper's motion character is
 * ease-out-only, never spring, so there's nothing here that needs a
 * runtime physics engine. Keyframes live in app/globals.css; these are the
 * class-name helpers components reach for so nobody hand-picks a duration.
 */

export const transition = {
  fast: "transition duration-fast ease-out",
  base: "transition duration-base ease-out",
  slow: "transition duration-slow ease-out",
  canvas: "transition duration-canvas ease-out",
} as const;

export const animation = {
  /** Node appears on the canvas: scale .92->1, opacity 0->1. */
  nodeAppear: "animate-[node-appear_var(--dur-base)_var(--ease-out)]",
  /** Generic entrance for expanding UI (pillar children, popovers). */
  expandIn: "animate-[expand-in_var(--dur-canvas)_var(--ease-out)]",
  /** The PDF highlight "money shot": fade in, then one opacity pulse. */
  highlightPulse: "animate-[highlight-pulse_var(--dur-slow)_var(--ease-out)]",
  /** Loading skeleton shimmer sweep. */
  shimmer: "motion-shimmer",
  /** Contradiction edge dash-offset march. Disable above 4 visible edges. */
  dashMarch: "motion-dash-march",
} as const;

/** 40ms-per-sibling stagger, per §14.3's node-appear spec. */
export function staggerDelay(index: number, stepMs = 40) {
  return { animationDelay: `${index * stepMs}ms` };
}
