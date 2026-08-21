"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const PLACEHOLDERS = ["arxiv.org/abs/2401.12345", "10.1038/s41586-021-03819-2", "drop a PDF"];
const CYCLE_MS = 2600;

/**
 * Issue #296: the homepage's front door. A visitor's first real action used
 * to be looking at a generated illustration; this is the product's actual
 * entry point instead -- paste a link or drop a PDF.
 *
 * Honesty gate (issue #295, non-negotiable per #296): hosted ingest returns
 * 501 on this deployment, since the parse step shells out to a Python
 * interpreter Vercel's Node runtime doesn't have. Submitting here must never
 * hit that route. `ingestSupported` is the same isPdfIngestSupportedHere()
 * check /upload's real form gates on (passed down from the server so the
 * two surfaces can't disagree), and while it's false the field explains why
 * inline rather than failing after a click. The primary action is "Open a
 * paper someone has read" instead -- this field stays secondary until
 * ingest actually works, at which point it becomes primary with no layout
 * change (per the issue).
 *
 * Drag-and-drop file handling isn't implemented here: with ingest
 * architecturally blocked on this deployment, a real drop target would just
 * be more surface area for the same 501 this field is built to avoid.
 * "drop a PDF" stays as illustrative placeholder text, matching what the
 * real /upload form actually accepts once ingest is supported.
 */
export function FrontDoorField({ ingestSupported }: { ingestSupported: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <div className="mx-auto w-full max-w-xl">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-s-2 sm:flex-row"
      >
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          aria-label="Paste an arXiv link, a DOI, or drop a PDF"
          disabled={!ingestSupported}
          className="flex-1"
        />
        <button
          type="submit"
          disabled={!ingestSupported}
          className={buttonClassName("secondary", "md", "shrink-0 disabled:opacity-50")}
        >
          Add a paper
        </button>
      </form>

      {!ingestSupported && (
        <p className="mt-s-2 font-sans text-xs leading-relaxed text-ink-faint">
          Ingest runs locally only -- the hosted runtime has no Python interpreter for the parse
          step. Run Pepiros with <code className="font-mono text-ink">npm run dev</code> to add
          your own papers, or open one already grounded below.
        </p>
      )}

      <div className="mt-s-4 flex justify-center">
        <Link href="/discover" className={buttonClassName("primary", "md")}>
          Open a paper someone has read
        </Link>
      </div>
    </div>
  );
}
