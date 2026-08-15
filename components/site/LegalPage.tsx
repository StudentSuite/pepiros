import type { ReactNode } from "react";

/**
 * Shared frame for the plain-prose pages (privacy, terms, security, status,
 * FAQ, roadmap, changelog).
 *
 * Body copy sits on an opaque paper surface, per the surface rule: glass is for
 * chrome, never under something you are meant to read at length.
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
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-s-8">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
        {kicker}
      </p>
      <h1 className="mt-s-3 font-serif text-3xl leading-tight text-ink">{title}</h1>
      {intro && (
        <p className="mt-s-4 font-sans text-base leading-relaxed text-ink-muted">
          {intro}
        </p>
      )}
      {updated && (
        <p className="mt-s-3 font-mono text-[11px] text-ink-faint">
          Last updated {updated}
        </p>
      )}

      <div className="mt-s-7 flex flex-col gap-s-6">{children}</div>
    </main>
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
      <h2 className="font-serif text-lg text-ink">{title}</h2>
      <div className="mt-s-3 flex flex-col gap-s-3 font-sans text-sm leading-relaxed text-ink-muted">
        {children}
      </div>
    </section>
  );
}
