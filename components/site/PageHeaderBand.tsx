import { Band } from "@/components/chrome/Band";

/**
 * Shared masthead for every page below the homepage -- a slim shader-band
 * strip (kicker, title, optional dek), not the full-bleed 86vh hero
 * treatment Hero.tsx uses. Generalized out of LegalPage.tsx's own inline
 * header (which the 8 plain-prose pages already used) so About, Contact,
 * MCP, How It Works, and How To Use pick up the same treatment instead of
 * a plain text header with no shader presence at all -- "use that in the
 * hero of every page," 2026-08-23.
 */
export function PageHeaderBand({
  kicker,
  title,
  dek,
}: {
  kicker: string;
  title: string;
  /**
   * Plain string only, deliberately: this renders inside a permanently-dark
   * `<Band>` that does NOT pin `--accent*` the way `.surface-chrome` does
   * (see app/globals.css), so an interactive `text-accent-text` link dropped
   * in here would resolve against the ACTIVE page theme, not the band's own
   * dark surface -- in light theme that's a dark-violet link on a
   * near-black band background, the same contrast gap `.surface-chrome` was
   * built to close for Hero's front-door panel. Keep any linked copy in the
   * page body below the band instead (see how-to-use/page.tsx).
   */
  dek?: string;
}) {
  return (
    <Band as="section" variant="dark" className="px-6 py-s-6">
      <div className="mx-auto w-full max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-brand-ink-reversed/60">
          {kicker}
        </p>
        <h1 className="mt-s-2 font-sans font-bold text-2xl leading-tight text-brand-ink-reversed sm:text-3xl">
          {title}
        </h1>
        {dek && (
          <p className="mt-s-3 max-w-xl font-sans text-sm leading-relaxed text-brand-ink-reversed/70 sm:text-base">
            {dek}
          </p>
        )}
      </div>
    </Band>
  );
}
