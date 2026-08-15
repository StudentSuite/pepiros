/**
 * Zoom level-of-detail (docs/PLAN-V1.md §9.1).
 *
 * Zoomed out, a card's body text is a few unreadable pixels tall, but it
 * still costs the same layout work and still fills the space its neighbours
 * need to be distinguishable. Dropping detail as the view widens is what
 * makes a zoomed-out graph read as *shape* -- how many clusters, how they
 * connect -- rather than as a wall of grey rectangles.
 *
 * Thresholds are chosen against the real card widths (192-288px in
 * lib/layout/footprints.ts): below 0.45 a leaf card is under ~90px wide and
 * body text is illegible, and below 0.75 the body is legible only if you
 * lean in, while the title still reads.
 */
export type DetailLevel = "minimal" | "title" | "full";

export const LOD_TITLE_THRESHOLD = 0.45;
export const LOD_FULL_THRESHOLD = 0.75;

export function detailLevelFor(zoom: number): DetailLevel {
  if (!Number.isFinite(zoom)) return "full";
  if (zoom < LOD_TITLE_THRESHOLD) return "minimal";
  if (zoom < LOD_FULL_THRESHOLD) return "title";
  return "full";
}

/** Body copy, chips and badges: everything that is unreadable when small. */
export function showsBody(level: DetailLevel): boolean {
  return level === "full";
}

/**
 * Titles survive one band longer than bodies. At "minimal" a card becomes a
 * coloured block: at that size a title would render as a smear, and the
 * useful signal is position and colour, not words.
 */
export function showsTitle(level: DetailLevel): boolean {
  return level !== "minimal";
}
