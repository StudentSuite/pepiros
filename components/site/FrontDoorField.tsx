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
 * Honesty gate (issue #295, non-negotiable per #296), still real but no
 * longer permanently tripped: `ingestSupported` is the same
 * isPdfIngestSupportedHere() check /upload's real form gates on (passed
 * down from the server so the two surfaces can't disagree). It used to be
 * unconditionally false on the hosted deployment (Vercel's Node runtime has
 * no Python interpreter for the parse step); since StudentSuite/pepiros#318
 * hosted ingest routes through api/parse_pdf.py, a separate Vercel Python
 * Function, instead, so this is now false only when Storage isn't
 * configured (that path also needs Storage -- see runParsePyHosted()'s own
 * comment in lib/services/ingest.ts). When it IS false the field still
 * explains why inline rather than failing after a click, same as before.
 *
 * Drag-and-drop file handling isn't implemented here: this field's primary
 * action is still "Open a paper someone has read", by design (per #296),
 * not because of the parse limitation -- so a drop target is a real feature
 * gap, not something this fix unblocks by itself. "drop a PDF" stays as
 * illustrative placeholder text, matching what the real /upload form
 * actually accepts.
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
