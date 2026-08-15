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
 * Loading strategy: the day image gets `priority` (it is the LCP element on
 * first paint, since day is the default theme). The dark image is `eager` but
 * not `priority` -- it must already be decoded when someone hits the toggle,
 * or the first switch pops, but it should not compete for preload bandwidth
 * with the image actually being looked at.
 */
export function HeroImage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Painted ground, so a slow decode shows a plausible surface. */}
      <div className="hero-ground" />

      <div className="hero-layer hero-layer--day">
        <Image
          src="/hero-day.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <div className="hero-layer hero-layer--dark">
        <Image
          src="/hero-dark.png"
          alt=""
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/*
        Legibility scrim under the copy.

        The art's calm zone is calm in TONE but not in detail -- at shorter
        viewports the glowing sheets ride up far enough to sit directly behind
        the sub-paragraph and swallow it. --ink flipping with the theme is not
        enough on its own against a bright glowing sheet.

        So this is a real scrim, not a token gesture: near-solid at the very
        top where the wordmark sits, still substantial through the paragraph
        and CTAs, fully clear by 78% so the room below reads untouched.
      */}
      <div className="absolute inset-x-0 top-0 h-[78%] bg-gradient-to-b from-[var(--surface)]/85 via-[var(--surface)]/55 to-transparent" />
    </div>
  );
}
