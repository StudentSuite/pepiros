/**
 * Issue #337: a sparse starfield behind each shader band's own gradient.
 * One tiled SVG data URI, not a second WebGL pass -- the whole point is that
 * a CSS background-image costs nothing beyond what any band's existing
 * gradient background already costs, so it can sit in both the pre-hydration
 * fallback and the shader-active state for free (see Band.tsx for why it
 * has to be a sibling element, not part of `.shader-band` itself).
 *
 * The tile is one <symbol> (a four-point sparkle) placed at ten fixed
 * coordinates and scales -- deterministic, not Math.random(), so the output
 * is the same on every render and there is nothing to seed.
 */
const SPARKLE_PATH =
  "M0 -6 C 1 -2 2 -1 6 0 C 2 1 1 2 0 6 C -1 2 -2 1 -6 0 C -2 -1 -1 -2 0 -6 Z";

const SPARKLES: Array<{ x: number; y: number; scale: number; opacity: number }> = [
  { x: 18, y: 34, scale: 0.8, opacity: 0.55 },
  { x: 70, y: 12, scale: 1.3, opacity: 0.7 },
  { x: 130, y: 60, scale: 0.6, opacity: 0.4 },
  { x: 190, y: 20, scale: 1.1, opacity: 0.6 },
  { x: 40, y: 120, scale: 1.4, opacity: 0.8 },
  { x: 100, y: 150, scale: 0.7, opacity: 0.45 },
  { x: 160, y: 110, scale: 0.9, opacity: 0.55 },
  { x: 210, y: 160, scale: 0.6, opacity: 0.4 },
  { x: 20, y: 200, scale: 1.2, opacity: 0.65 },
  { x: 150, y: 210, scale: 0.8, opacity: 0.5 },
];

const TILE_SIZE = 240;

const STARFIELD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}"><defs><path id="s" d="${SPARKLE_PATH}" fill="#fff"/></defs>${SPARKLES.map(
  (s) =>
    `<use href="#s" opacity="${s.opacity}" transform="translate(${s.x} ${s.y}) scale(${s.scale})"/>`,
).join("")}</svg>`;

/** Ready to assign straight to a `backgroundImage` style: `url("data:...")`. */
export const STARFIELD_BACKGROUND_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(STARFIELD_SVG)}")`;
export const STARFIELD_TILE_SIZE = `${TILE_SIZE}px ${TILE_SIZE}px`;
