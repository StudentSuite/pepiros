/**
 * Block 3 (plan §6.1): replaces Cohere's trust-logo carousel. "Pepiros is a
 * solo-built research tool with no enterprise logos and no customer quotes.
 * Shipping empty social-proof theater would actively undermine a product
 * whose core rule is that it says 'quote located' instead of 'verified'."
 *
 * What replaces it: what Pepiros actually ingests, stated plainly. This
 * doubles as a capability statement, which is the honest thing a solo tool
 * has instead of a trust badge.
 *
 * DELIBERATELY TEXT, NOT LOGOS. The plan calls for "grayscale marks", which
 * would mean drawing arXiv / Crossref / PubMed wordmarks -- third-party
 * trademarks this project has no relationship with and no licence to
 * reproduce. A plain mono label row says the same true thing without
 * fabricating a brand association that doesn't exist.
 */
const SOURCES = ["arXiv", "DOI / Crossref", "PubMed", "PDF upload"] as const;

export function SourceStrip() {
  return (
    <div className="border-t border-border py-s-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-s-3 px-6 text-center">
        <p className="kicker">What it reads</p>
        <ul className="flex flex-wrap items-center justify-center gap-x-s-6 gap-y-s-2">
          {SOURCES.map((source) => (
            <li key={source} className="font-mono text-sm text-ink-muted">
              {source}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
