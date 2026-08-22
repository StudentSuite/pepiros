import { FrontDoorField } from "@/components/site/FrontDoorField";
import { CatalogBrowser } from "@/components/site/CatalogBrowser";
import type { CatalogPaper } from "@/lib/data/papers";

/**
 * Landing hero -- the front door (issue #296, superseding #246/#247).
 *
 * JSTOR reference point: the page opens on the product's first real action,
 * not a picture of one. A wide paste-or-drop field (FrontDoorField) is the
 * literal "start here", with discipline chips and a strip of real catalog
 * papers (CatalogBrowser) underneath so there's always something to click
 * regardless of whether ingest is available on this deployment.
 *
 * Honesty gate (issue #295): hosted ingest 501s here, so `ingestSupported`
 * (passed down from the server, the same isPdfIngestSupportedHere() check
 * /upload's real form gates on) makes "Open a paper someone has read" the
 * primary action rather than the paste field, until ingest actually works.
 */
export function Hero({
  ingestSupported,
  papers,
}: {
  ingestSupported: boolean;
  papers: CatalogPaper[];
}) {
  return (
    <section className="flex flex-col items-center px-6 pb-s-9 pt-[10vh] text-center">
      {/* The wordmark IS the headline here. Tracking matches the brand kit
          spec (letter-spacing 18 at font-size 62 = 0.29em), with the
          trailing letter-space pulled back so it optically centres. */}
      <h1 className="-mr-[0.29em] font-serif text-5xl uppercase leading-none tracking-[0.29em] text-ink sm:text-6xl md:text-7xl">
        Pepiros
      </h1>

      {/* Tagline, confirmed 2026-08-22: "Be the source." wins over the old
          "Every claim, one click from its source." (plan.md section 10 /
          the former design/DIRECTIONS.md) -- matches the OG/social-share
          card (app/opengraph-image.png), which was the real decided copy. */}
      <p className="mx-auto mt-s-5 max-w-xl font-sans text-base leading-relaxed text-ink-muted sm:text-lg">
        Be the source.
      </p>

      <div className="mt-s-7 w-full">
        <FrontDoorField ingestSupported={ingestSupported} />
        <CatalogBrowser papers={papers} />
      </div>
    </section>
  );
}
