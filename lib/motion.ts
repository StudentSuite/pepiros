/**
 * The motion durations, in milliseconds, for the handful of callers that
 * cannot use the CSS tokens.
 *
 * app/globals.css is the source of truth (`--dur-fast` and friends), and
 * everything that can express itself in CSS should use the Tailwind classes
 * that map to them: `duration-fast`, `duration-base`, `duration-slow`,
 * `duration-canvas`. Those follow the tokens automatically and, importantly,
 * are covered by the global `prefers-reduced-motion` rule that clamps every
 * transition-duration down to `--dur-fast`.
 *
 * React Flow's imperative viewport API (`fitView`, `setViewport`) takes a real
 * number and animates in JS, so it cannot read a custom property. Before this
 * module those numbers were written inline at four call sites, hand-matched to
 * the token values at the time (590 for --dur-canvas, 320 for --dur-base, 160
 * for --dur-fast). That duplication went stale the moment the tokens were
 * retuned on 2026-09-03: the canvas kept animating at the old, faster speeds
 * while every CSS transition around it had slowed, which is exactly the kind
 * of drift a token system exists to prevent.
 *
 * KEEP THESE IN SYNC WITH app/globals.css BY HAND. There is no build-time link
 * between the two, so changing a `--dur-*` value means changing it here too.
 *
 * REDUCED MOTION IS NOT AUTOMATIC HERE either. The CSS rule cannot reach a JS
 * animation, so a caller that should honour it must check
 * `hooks/usePrefersReducedMotion` and pass 0.
 */
export const MOTION_MS = {
  /** Mirrors --dur-fast. */
  fast: 220,
  /** Mirrors --dur-base. */
  base: 420,
  /** Mirrors --dur-slow. */
  slow: 700,
  /** Mirrors --dur-canvas. Graph viewport moves: fit, focus, recentre. */
  canvas: 820,
} as const;
