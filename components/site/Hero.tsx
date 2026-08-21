import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { HeroGroundingMoment } from "@/components/site/HeroGroundingMoment";

/**
 * Landing hero.
 *
 * Issue #246: used to be a full-bleed generated illustration of a library,
 * which carried no information about what the product does and didn't match
 * the locked visual direction. Replaced with HeroGroundingMoment -- the
 * product doing its one trick (a real claim, ref, quote and match score, in
 * one short sequence on load) instead of an image standing in for it.
 *
 * Also drops the previous min-h-[92vh] full-viewport sizing, which existed
 * to give the generated art room -- with a real content card instead of a
 * background image, the section sizes to its content (issue #247's "cut the
 * height" also benefits from this).
 */
export function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pb-s-9 pt-[10vh] text-center">
      {/* The wordmark IS the headline here. Tracking matches the brand kit
          spec (letter-spacing 18 at font-size 62 = 0.29em), with the
          trailing letter-space pulled back so it optically centres. */}
      <h1 className="-mr-[0.29em] font-serif text-5xl uppercase leading-none tracking-[0.29em] text-ink sm:text-6xl md:text-7xl">
        Pepiros
      </h1>

      {/* The locked tagline (plan.md section 10 / design/DIRECTIONS.md's
          brand kit): "Every claim, one click from its source." A prior
          rewrite led with "publishing platform for researchers", which
          positioned Pepiros as a general publishing tool rather than
          naming what it specifically does. */}
      <p className="mx-auto mt-s-5 max-w-xl font-sans text-base leading-relaxed text-ink-muted sm:text-lg">
        Every claim, one click from its source.
      </p>

      <div className="mt-s-7 flex flex-wrap items-center justify-center gap-s-3">
        <Link href="/w/ws-1" className={buttonClassName("primary")}>
          Try the demo workspace
        </Link>
        <Link href="/how-it-works" className={buttonClassName("secondary")}>
          See how verification works
        </Link>
      </div>

      <div className="mt-s-9 w-full">
        <HeroGroundingMoment />
      </div>
    </section>
  );
}
