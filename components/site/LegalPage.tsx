"use client";

import { useRef, type ReactNode } from "react";
import { LegalPageIndex } from "@/components/site/LegalPageIndex";
import { PageHeaderBand } from "@/components/site/PageHeaderBand";

/**
 * Shared frame for the eight plain-prose pages (privacy, terms, security,
 * status, FAQ, roadmap, changelog, docs). One component restyled fixes all
 * eight (plan §6.4).
 *
 * "Dense and utilitarian, closer to GitHub docs than marketing": a slim
 * shader header strip (the mesh gradient at reduced height, not the
 * full-bleed hero treatment -- see design/anti-slop.md on why the shader
 * stays a bookend rather than the page's default surface), a sticky section
 * index at `lg` derived from whatever real headings the page has
 * (LegalPageIndex.tsx), then prose. Body copy sits on an opaque paper
 * surface, per the surface rule: glass is for chrome, never under something
 * you are meant to read at length.
 */
export function LegalPage({
  kicker,
  title,
  intro,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  intro?: string;
  updated?: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <PageHeaderBand kicker={kicker} title={title} />

      {/* A <div>, not a second <main>: app/(marketing)/layout.tsx already
          wraps every page in <main id="main-content">. This file's root
          element used to be its own <main>, which produced two nested main
          landmarks on every one of the 8 pages it serves -- invalid HTML and
          a real screen-reader confusion, pre-existing before this pass. */}
      <div className="mx-auto w-full max-w-4xl px-s-5 py-s-6">
        <div className="lg:flex lg:items-start lg:gap-s-8">
          <LegalPageIndex containerRef={contentRef} />

          <div className="min-w-0 flex-1">
            {intro && (
              <p className="font-sans text-base leading-relaxed text-ink-muted">{intro}</p>
            )}
            {updated && (
              <p className="mt-s-3 font-mono text-[11px] text-ink-faint">Last updated {updated}</p>
            )}

            <div ref={contentRef} className="mt-s-7 flex flex-col gap-s-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-sans font-semibold text-lg text-ink">{title}</h2>
      <div className="mt-s-3 flex flex-col gap-s-3 font-sans text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}
