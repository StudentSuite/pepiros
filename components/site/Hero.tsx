import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { HeroImage } from "@/components/site/HeroImage";

/**
 * Landing hero.
 *
 * Composition follows the studyymap pattern: copy sits top-centre, the art is
 * full-bleed horizontally and continues past the bottom of the viewport rather
 * than resolving inside a neat box. The generated art was authored for exactly
 * this -- its upper third is deliberately calm so the headline has somewhere
 * to live without a heavy scrim.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[92vh] flex-col overflow-hidden">
      <HeroImage />

      <div className="mx-auto w-full max-w-3xl px-6 pt-[14vh] text-center">
        {/* The wordmark IS the headline here. Tracking matches the brand kit
            spec (letter-spacing 18 at font-size 62 = 0.29em), with the
            trailing letter-space pulled back so it optically centres. */}
        <h1 className="-mr-[0.29em] font-serif text-5xl uppercase leading-none tracking-[0.29em] text-ink sm:text-6xl md:text-7xl">
          Pepiros
        </h1>

        <p className="mx-auto mt-s-5 max-w-xl font-sans text-base leading-relaxed text-ink-muted sm:text-lg">
          Every claim a model surfaces stays bound to the exact quoted sentence
          it came from, checked deterministically rather than asserted, and
          callable from your agent mid-conversation.
        </p>

        <div className="mt-s-7 flex flex-wrap items-center justify-center gap-s-3">
          <Link href="/login?next=%2Fw%2Fws-1" className={buttonClassName("primary")}>
            Try the demo workspace
          </Link>
          <Link href="/how-it-works" className={buttonClassName("secondary")}>
            See how verification works
          </Link>
        </div>
      </div>
    </section>
  );
}
