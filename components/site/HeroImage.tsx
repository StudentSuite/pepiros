import Image from "next/image";

/**
 * The theme-swapped hero art.
 *
 * Both images are rendered simultaneously and cross-dissolved by opacity.
 * This is not laziness, it is the only correct option here:
 *
 *   - Choosing a `src` from `useTheme()` cannot work. The server has no theme,
 *     so whichever it picked would mismatch on hydration for half of visitors.
 *   - Swapping `src` on an existing <img> cannot cross-dissolve. It decodes and
 *     pops, which is exactly the abruptness we are avoiding.
 *
 * So both layers live in the DOM and CSS decides which is visible, driven off
 * the `.dark` class on <html>. The fade itself is defined in app/globals.css
 * (HERO THEME CROSSFADE) using keyframe animations rather than transitions,
 * because next-themes freezes transitions for one frame during the swap.
 *
 * FORMAT. Both are WebP, generated from the PNG sources by
 * scripts/optimize-hero.cjs. The pair went from ~3.7MB to ~210KB, which matters
 * doubly here because BOTH have to be fetched: the whole point is that toggling
 * the theme does not wait on a download. The PNGs remain the source of truth,
 * since hero-dark is derived from hero-day and re-deriving from a lossy file
 * would compound.
 *
 * PRIORITY. Both layers carry it. Whichever theme the visitor lands in, that
 * image is the largest element on screen and therefore the LCP candidate;
 * marking only the day one left dark-mode visitors with an unprioritised LCP.
 * At ~105KB each that is an affordable preload, which it would not have been
 * as PNG.
 *
 * No `quality` prop: the sources are already WebP at q82, so asking Next to
 * re-encode them gains nothing, and setting a non-default value would need an
 * images.qualities entry in next.config from Next 16 onward.
 */
export function HeroImage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Painted ground, so a slow decode shows a plausible surface. */}
      <div className="hero-ground" />

      <div className="hero-layer hero-layer--day">
        <Image
          src="/hero-day.webp"
          alt=""
          fill
          priority
          // Full-bleed, so the intrinsic width is the viewport minus whatever
          // the scrollbar takes. 100vw over-states it slightly and Next warns;
          // 100vw with a small deduction matches what actually renders.
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="hero-layer hero-layer--dark">
        <Image
          src="/hero-dark.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/*
        Legibility scrim under the copy.

        The art's calm zone is calm in TONE but not in detail: at shorter
        viewports the glowing sheets ride up far enough to sit behind the
        sub-paragraph and swallow it. --ink flipping with the theme is not
        enough on its own against a bright glowing sheet.
      */}
      <div className="absolute inset-x-0 top-0 h-[78%] bg-gradient-to-b from-[var(--surface)]/85 via-[var(--surface)]/55 to-transparent" />
    </div>
  );
}
