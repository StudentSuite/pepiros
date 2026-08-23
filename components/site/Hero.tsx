import Link from "next/link";
import { Band } from "@/components/chrome/Band";
import { bandButtonClassName } from "@/components/chrome/band-button";

/**
 * Block 1 of the homepage rebuild (plan §6.1): "Full-bleed Band, shader +
 * chrome forms bleeding from the top corners and cropping off-canvas. Geist
 * headline, white, centered. One line of subcopy. White pill primary +
 * ghost secondary."
 *
 * Deliberately simpler than the section it replaces. The previous Hero also
 * carried the paste-a-paper field and the full discipline-chip catalog
 * browser directly on the page background; both move to their own blocks
 * now (FrontDoorField overlaps this band's bottom edge as block 2; the
 * catalog browsing surface lives in the discipline grid, block 6). Putting
 * muted UI chrome (chip borders, faint text) directly on top of a moving
 * gradient tested poorly for contrast during the shader smoke test this
 * session -- the plan's own spec for this block is only ever high-contrast
 * elements (white wordmark, white pills) for exactly that reason.
 */
export function Hero() {
  return (
    <Band as="section" className="flex flex-col items-center px-6 pb-s-8 pt-[14vh] text-center">
      <h1 className="-mr-[0.15em] font-sans text-5xl font-bold uppercase leading-none tracking-[0.15em] text-brand-ink-reversed sm:text-6xl md:text-7xl">
        Pepiros
      </h1>

      <p className="mx-auto mt-s-5 max-w-xl font-sans text-base leading-relaxed text-brand-ink-reversed/70 sm:text-lg">
        Be the source.
      </p>

      <div className="mt-s-7 flex flex-wrap items-center justify-center gap-s-3">
        <Link href="/discover" className={bandButtonClassName("primary")}>
          Browse the library
        </Link>
        <Link href="/upload" className={bandButtonClassName("ghost")}>
          Add a paper
        </Link>
      </div>
    </Band>
  );
}
