import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Hackathon origin -- plan.md's own header line ("Hackathon: Aug 7-19,
// 2026. Real build window: Aug 10-17, ship Aug 17, submit Aug 18. Team:
// Anay + Yash, both driving Claude Code."), plus the copyright holders'
// full names from LICENSE ("Copyright (c) 2026 Anay Dhawan and Yash
// Kewlani") and CONTRIBUTING.md's "Maintained by Anay Dhawan". No
// biographical detail invented beyond those three sources.
const TEAM = "Anay Dhawan and Yash Kewlani";

/**
 * `/about` -- hackathon origin, why grounding is the whole point, and a
 * placeholder in place of a GitHub link. The repo is private through
 * submission (this task's brief + the surrounding project context both say
 * so), so a real github.com/... URL here would just point at something a
 * visitor can't reach -- a disabled-looking text note stands in instead.
 * Header banner -> origin -> why grounding -> repo status. Header/footer
 * come from app/(marketing)/layout.tsx.
 */
export default function AboutPage() {
  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-14 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">About</p>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Two people, one hackathon.
        </h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
          Pepiros started as a hackathon build, and it still is one.
        </p>
      </section>

      {/* Origin -- plan.md's header line, verbatim dates and team. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Where this came from
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">Built Aug 7&ndash;19, 2026</h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Pepiros was built for a hackathon running Aug 7&ndash;19, 2026, with the real build
              window Aug 10&ndash;17: ship Aug 17, submit Aug 18. It&apos;s a two-person team,{" "}
              {TEAM}, both building with Claude Code the whole way through.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Why grounding -- plan.md §4's honest-framing paragraph, in the
          project's own voice here rather than reused verbatim from the home
          page / how-it-works, same substance: a fuzzy match proves
          quotation, not entailment. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Why grounding
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">Why this exists at all</h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              A fuzzy-matched quote proves quotation, not entailment. A model can attach a real
              Methods sentence to a wrong conclusion and still score a perfect match. That&apos;s
              why the badge always reads quote located and never verified, and why claim and
              quote render side by side so a reader adjudicates it themselves instead of taking a
              model&apos;s word for it.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Repo status -- no GitHub link. Disabled-looking text note instead
          of a real link, so it can't 404 or imply the repo is public
          already. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-3 px-6 py-16">
            <span
              className={buttonClassName(
                "secondary",
                "sm",
                "pointer-events-none cursor-default select-none opacity-40",
              )}
              aria-disabled="true"
            >
              GitHub: coming at public launch
            </span>
            <Link href="/how-it-works" className={buttonClassName("primary", "sm")}>
              See how verification works
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
