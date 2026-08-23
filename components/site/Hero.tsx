import Link from "next/link";
import { Band } from "@/components/chrome/Band";
import { bandButtonClassName } from "@/components/chrome/band-button";
import { FrontDoorField } from "@/components/site/FrontDoorField";
import { StatsCounters } from "@/components/site/StatsCounters";

/**
 * Block 1 of the homepage rebuild (plan §6.1), redesigned per the approved
 * do-all-of-the-silly-gem plan §2. Full-bleed Band, shader + chrome forms
 * bleeding from the top corners and cropping off-canvas. Geist headline,
 * white, centered.
 *
 * The front-door field and stats now live INSIDE the hero rather than as a
 * separate overlapping card (the old approach broke: a 1px conic-gradient
 * ring behind a `.glass` panel bled through the whole panel because
 * `.glass`'s background is only 62% opaque, so ~38% of the ring's full-box
 * gradient showed everywhere, not just at the edge). The field now sits in
 * a `.surface-chrome` panel -- a permanently-dark surface that pins its own
 * `--accent*` tokens regardless of site theme, so the panel's inputs and
 * buttons render correctly even when the rest of the page is in light
 * theme. `min-h-[86vh]` (not 100vh) accounts for the sticky header sitting
 * above this in normal flow, so the visible hero still clears 75vh at
 * realistic viewport heights -- confirmed in a real browser per plan §8,
 * not just by arithmetic.
 */
export function Hero({
  papersInCatalog,
  claimsAnchored,
  mcpToolsLive,
  ingestSupported,
}: {
  papersInCatalog: number;
  claimsAnchored: number;
  mcpToolsLive: number;
  ingestSupported: boolean;
}) {
  return (
    <Band
      as="section"
      className="flex min-h-[86vh] flex-col items-center justify-center px-s-5 pb-s-8 pt-s-8 text-center"
    >
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

      <div className="surface-chrome mx-auto mt-s-7 w-full max-w-xl rounded-xl border border-brand-ink-reversed/15 p-s-5">
        <FrontDoorField ingestSupported={ingestSupported} />
      </div>

      <div className="mt-s-6">
        <StatsCounters
          papersInCatalog={papersInCatalog}
          claimsAnchored={claimsAnchored}
          mcpToolsLive={mcpToolsLive}
          tone="band"
        />
      </div>
    </Band>
  );
}
