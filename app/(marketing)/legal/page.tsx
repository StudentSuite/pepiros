import type { Metadata } from "next";
import Link from "next/link";
import {
  ArticleBody,
  ArticleHeader,
  ArticleRule,
  ReadingColumn,
} from "@/components/reading/Article";
import { CATALOG, isOpenAccess } from "@/lib/data/papers";

export const metadata: Metadata = {
  title: "Legal",
  description: "Pepiros licence, data sources, and what this project does not claim to be.",
};

// Verbatim contents of the repo-root LICENSE file. Reproduced exactly rather
// than paraphrased, so "state it plainly" means showing the real text.
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

// Issue #315: computed from the real catalog rather than hardcoded, so this
// can't drift from lib/data/papers.ts the way a written-down number would.
const OPEN_ACCESS_COUNT = CATALOG.filter((p) => isOpenAccess(p.licence)).length;
const ARXIV_COUNT = CATALOG.filter((p) => p.licence === "arxiv-perpetual").length;

export default function LegalPage() {
  return (
    <main className="pb-s-5">
      <ReadingColumn>
        <ArticleHeader
          kicker="Legal"
          title="Licence, sources, and limits."
          dek="What you may do with the code, where the papers come from, and what a badge does not mean."
        />

        <ArticleBody>
          <section id="license" className="scroll-mt-topbar">
            <h2>MIT licence</h2>
            <p>
              Do nearly anything with the code, keep the copyright notice, and
              accept that no warranty is offered. The full text:
            </p>
          </section>
        </ArticleBody>

        <pre className="mt-s-4 overflow-x-auto rounded-md border border-border bg-surface-sunken/60 p-s-4">
          <code className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-muted">
            {LICENSE_TEXT}
          </code>
        </pre>

        <ArticleRule />

        <ArticleBody>
          <section id="data" className="scroll-mt-topbar">
            <h2>Where the papers come from</h2>
            <p>
              {OPEN_ACCESS_COUNT} of the catalog&rsquo;s {CATALOG.length} papers
              are open access today ({ARXIV_COUNT} from arXiv under its own
              distribution licence, the rest CC BY or PMC open-access) and are
              the ones actually indexed and readable. The remainder are
              catalogued for reference and still browsable, but never fetched
              or served as open access -- paywalled or unverified licensing
              means the same thing here it would anywhere else. Only
              bibliographic metadata is stored, never article text, and every
              entry links out to the publisher.
            </p>
            <p>
              Anything you upload yourself stays private to your own workspace.
              It is never added to the public library unless its licence
              explicitly permits it.
            </p>
          </section>

          <section id="disclaimers" className="scroll-mt-topbar">
            <h2>What a badge does not mean</h2>
            <p>
              Pepiros is a research prototype, not a certified or clinically
              validated tool. A <strong>quote located</strong> badge means the
              cited sentence exists at the stated page in the source, checked
              deterministically. It is not a claim that the research is correct,
              complete, or current, and it is never a claim that the sentence
              supports the conclusion drawn from it. That distinction is the
              whole design, and it is explained on{" "}
              <Link href="/how-it-works">how it works</Link>.
            </p>
            <p>
              Nothing generated here is medical, legal, or clinical advice.
              Verify against the primary source, and consult a qualified
              professional before acting on anything you read.
            </p>
          </section>
        </ArticleBody>
      </ReadingColumn>
    </main>
  );
}
