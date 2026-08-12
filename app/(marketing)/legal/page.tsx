import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

// Verbatim contents of the repo-root LICENSE file. Reproduced exactly, not
// paraphrased, so "state that plainly" means the reader sees the real text
// rather than a summary of it.
const LICENSE_TEXT = `MIT License

Copyright (c) 2026 Anay Dhawan and Yash Kewlani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

/**
 * `/legal` -- three anchored sections SiteFooter already links into
 * (`/legal#license` from the Connect column). `scroll-mt-topbar` on each
 * `<section>` keeps the sticky header (h-topbar) from covering the heading
 * on an anchor jump. Header/footer come from app/(marketing)/layout.tsx.
 */
export default function LegalPage() {
  return (
    <main className="flex flex-col">
      {/* Banner header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 pb-14 pt-20 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Legal</p>
        <h1 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">Legal</h1>
        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
          License, what data goes where, and what this project doesn&apos;t claim to be.
        </p>
      </section>

      {/* License -- LICENSE file at repo root, MIT, reproduced verbatim. */}
      <Reveal>
        <section id="license" className="scroll-mt-topbar border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">License</p>
            <h2 className="mt-2 font-serif text-2xl text-ink">MIT</h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Pepiros is MIT licensed, stated plainly: do nearly anything with the code, keep the
              copyright notice, no warranty is offered. Full text below.
            </p>
            <div className="surface-reading paper-grain mt-6 rounded-lg p-s-6">
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#1c1a15]">
                <code>{LICENSE_TEXT}</code>
              </pre>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Data sources -- docs/PLAN-V1.md §22.2, open-access-only rule. */}
      <Reveal>
        <section id="data-sources" className="scroll-mt-topbar border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Data sources
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">Open-access only</h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Only papers Pepiros is legally allowed to list ever show up in the public,
              curated library: arXiv, PMC open access, and other CC-licensed work. Anything you
              upload yourself stays private to your own workspace and is never added to the
              public catalog unless its license explicitly permits it.
            </p>
          </div>
        </section>
      </Reveal>

      {/* Disclaimers -- research-prototype / hackathon-origin note, no
          medical/legal/clinical advice implied. The clinician persona
          (docs/PLAN-V1.md §1.5) is the concrete reason this section exists,
          not boilerplate for its own sake. */}
      <Reveal>
        <section id="disclaimers" className="scroll-mt-topbar border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Disclaimers
            </p>
            <h2 className="mt-2 font-serif text-2xl text-ink">
              A research prototype, not a professional opinion
            </h2>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Pepiros is a hackathon-origin research prototype (built Aug 7&ndash;19, 2026), not a
              certified or clinically validated tool. A quote located badge means the cited
              sentence exists at the stated page in the source PDF, checked deterministically. It
              is not a claim that the underlying research is correct, complete, or current.
            </p>
            <p className="mt-4 max-w-xl font-sans text-sm leading-relaxed text-ink-muted">
              Nothing generated here, summaries, pillar notes, or chat answers, is medical, legal,
              or clinical advice. Verify against the primary source and consult a qualified
              professional before acting on anything you read here.
            </p>
          </div>
        </section>
      </Reveal>

      {/* CTA row. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-3xl items-center px-6 py-16">
            <Link href="/contact" className={buttonClassName("secondary")}>
              Questions? Get in touch
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
