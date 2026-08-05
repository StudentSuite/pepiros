import clsx from "clsx";

interface Swatch {
  name: string;
  className: string;
  textClassName?: string;
}

const SURFACES: Swatch[] = [
  { name: "surface", className: "bg-surface" },
  { name: "surface-raised", className: "bg-surface-raised" },
  { name: "surface-sunken", className: "bg-surface-sunken" },
];

const PAPER: Swatch[] = [
  { name: "paper", className: "bg-paper", textClassName: "text-[#1c1a15]" },
  { name: "paper-muted", className: "bg-paper-muted", textClassName: "text-[#1c1a15]" },
];

const INK: Swatch[] = [
  { name: "ink", className: "bg-ink", textClassName: "text-surface" },
  { name: "ink-muted", className: "bg-ink-muted", textClassName: "text-surface" },
  { name: "ink-faint", className: "bg-ink-faint", textClassName: "text-surface" },
];

const BORDER: Swatch[] = [
  { name: "border", className: "bg-border" },
  { name: "border-strong", className: "bg-border-strong" },
];

const PILLARS: Swatch[] = [1, 2, 3, 4, 5, 6].map((i) => ({
  name: `pillar-${i}`,
  className: `bg-pillar-${i}`,
}));

const TIERS: Swatch[] = [
  { name: "located", className: "bg-located" },
  { name: "paraphrase", className: "bg-paraphrase" },
  { name: "unsupported", className: "bg-unsupported" },
];

function SwatchGrid({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div key={s.name} className="flex flex-col gap-1">
            <div
              className={clsx(
                "flex h-16 w-28 items-end rounded border border-border p-1.5",
                s.className,
              )}
            >
              <span className={clsx("font-mono text-[10px]", s.textClassName ?? "text-ink")}>
                {s.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Design-tokens reference page: every CSS custom property in
// app/globals.css, plus font-family samples. Static, server-rendered, no
// store dependency -- pure eyeball reference for both agents on this repo.
export default function DesignTokensPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="font-serif text-2xl text-ink">Design tokens</h1>
        <p className="mt-1 font-sans text-sm text-ink-muted">
          &ldquo;Lab notebook at night&rdquo; -- dark-first, no light theme, pillar colour is
          structural (plan.md §10).
        </p>
      </div>

      <SwatchGrid title="Surfaces (dark app chrome)" swatches={SURFACES} />
      <SwatchGrid title="Reading surfaces (paper-white, PDF/prose only)" swatches={PAPER} />
      <SwatchGrid title="Ink (text on dark chrome)" swatches={INK} />
      <SwatchGrid title="Border" swatches={BORDER} />
      <SwatchGrid title="Pillar colour (structural, shared by nodes/edges/chips)" swatches={PILLARS} />
      <SwatchGrid title="Evidence tiers (never call these 'verified')" swatches={TIERS} />

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Type families
        </h2>
        <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
          <p className="font-serif text-lg text-ink">
            font-serif -- reading prose, node body markdown, PDF text
          </p>
          <p className="font-sans text-lg text-ink">
            font-sans -- UI chrome: nav, buttons, labels (the grotesque)
          </p>
          <p className="font-mono text-lg text-ink">font-mono -- citation ids only, e.g. C7 N12</p>
        </div>
      </section>
    </main>
  );
}
