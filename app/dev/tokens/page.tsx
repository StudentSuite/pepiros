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

const ACCENT: Swatch[] = [
  { name: "accent", className: "bg-accent" },
  { name: "accent-hover", className: "bg-accent-hover" },
  { name: "accent-sunk", className: "bg-accent-sunk" },
];

// Full class names spelled out (not interpolated), same reason as SPACING
// above -- these also match how the app actually applies pillar colour
// (inline style off pillarColor(), see components/ui/PillarChip.tsx), this
// grid alone uses the Tailwind utility for a quick static-swatch preview.
const PILLARS: Swatch[] = [
  { name: "pillar-1 (stone)", className: "bg-pillar-1" },
  { name: "pillar-2 (clay)", className: "bg-pillar-2" },
  { name: "pillar-3 (sage)", className: "bg-pillar-3" },
  { name: "pillar-4 (dusk)", className: "bg-pillar-4" },
  { name: "pillar-5 (rose)", className: "bg-pillar-5" },
  { name: "pillar-6 (ochre)", className: "bg-pillar-6" },
  { name: "pillar-7 (teal)", className: "bg-pillar-7" },
];

const TIERS: Swatch[] = [
  { name: "located", className: "bg-located" },
  { name: "paraphrase", className: "bg-paraphrase" },
  { name: "unsupported", className: "bg-unsupported" },
  { name: "inference", className: "bg-inference" },
  { name: "ungrounded", className: "bg-ungrounded" },
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
                "flex h-16 w-32 items-end rounded border border-border p-1.5",
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

// Full class names spelled out (not interpolated) -- Tailwind's JIT scanner
// needs the literal string in source, a template literal wouldn't be seen.
const SPACING: { name: string; className: string }[] = [
  { name: "s-1", className: "w-s-1" },
  { name: "s-2", className: "w-s-2" },
  { name: "s-3", className: "w-s-3" },
  { name: "s-4", className: "w-s-4" },
  { name: "s-5", className: "w-s-5" },
  { name: "s-6", className: "w-s-6" },
  { name: "s-7", className: "w-s-7" },
  { name: "s-8", className: "w-s-8" },
];
const RADII: { name: string; className: string }[] = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "full", className: "rounded-full" },
];
const SHADOWS: { name: string; className: string }[] = [
  { name: "e-1", className: "shadow-e-1" },
  { name: "e-2", className: "shadow-e-2" },
  { name: "e-3", className: "shadow-e-3" },
  { name: "glow-accent", className: "shadow-glow-accent" },
];
const DURATIONS: { name: string; ms: string }[] = [
  { name: "fast", ms: "170ms" },
  { name: "base", ms: "280ms" },
  { name: "slow", ms: "450ms" },
  { name: "canvas", ms: "590ms" },
];
const LAYOUT_DIMS: { name: string; value: string }[] = [
  { name: "rail-left", value: "64px" },
  { name: "panel-papers", value: "256px" },
  { name: "inspector", value: "clamp(400px, 34vw, 560px)" },
  { name: "chat-collapsed", value: "56px" },
  { name: "chat-open", value: "min(46vh, 420px)" },
  { name: "topbar", value: "52px" },
];

// Design-tokens reference page: every CSS custom property in
// app/globals.css, plus font-family samples. Static, server-rendered, no
// store dependency -- pure eyeball reference for both agents on this repo.
export default function DesignTokensPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
      <div>
        <h1 className="font-serif text-2xl text-ink">Design tokens</h1>
        <p className="mt-1 font-sans text-sm text-ink-muted">
          &ldquo;Lab notebook at night,&rdquo; Editorial Paper direction -- dark-first, no light
          theme, pillar colour is structural. Full brief:{" "}
          <code className="font-mono text-xs">design/DIRECTIONS.md</code>, tokens:{" "}
          <code className="font-mono text-xs">docs/PLAN-V1.md §14.2</code>.
        </p>
      </div>

      <SwatchGrid title="Surfaces (dark app chrome)" swatches={SURFACES} />
      <SwatchGrid title="Reading surfaces (paper-white, PDF/prose only)" swatches={PAPER} />
      <SwatchGrid title="Ink (text on dark chrome)" swatches={INK} />
      <SwatchGrid title="Border" swatches={BORDER} />
      <SwatchGrid title="Accent (interactive/focus, distinct from pillar colour)" swatches={ACCENT} />
      <SwatchGrid
        title="Pillar colour (structural, shared by nodes/edges/chips) -- canonical Editorial Paper set"
        swatches={PILLARS}
      />
      <SwatchGrid title="Evidence tiers (never call these 'verified')" swatches={TIERS} />

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Type families
        </h2>
        <div className="flex flex-col gap-3 rounded border border-border bg-surface-raised p-4">
          <p className="font-serif text-lg text-ink">
            font-serif (Source Serif 4) -- reading prose, node body markdown, PDF text
          </p>
          <p className="font-sans text-lg text-ink">
            font-sans (Inter) -- UI chrome: nav, buttons, labels (the grotesque)
          </p>
          <p className="font-mono text-lg text-ink">
            font-mono (JetBrains Mono) -- citation ids only, e.g. C7 N12
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Spacing scale (s-1..8) -- reading contexts step up one size, per Editorial Paper&apos;s
          +25% whitespace rule
        </h2>
        <div className="flex flex-wrap items-end gap-3 rounded border border-border bg-surface-raised p-4">
          {SPACING.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1">
              <div className={clsx("h-4 bg-pillar-4", s.className)} />
              <span className="font-mono text-[10px] text-ink-faint">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">Radius scale</h2>
        <div className="flex flex-wrap gap-3">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-1">
              <div className={clsx("h-12 w-12 bg-pillar-6", r.className)} />
              <span className="font-mono text-[10px] text-ink-faint">{r.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Elevation -- borders plus low-alpha shadow, never a big blur
        </h2>
        <div className="flex flex-wrap gap-6">
          {SHADOWS.map((sh) => (
            <div key={sh.name} className="flex flex-col items-center gap-2">
              <div className={clsx("h-14 w-20 rounded-md bg-surface-raised", sh.className)} />
              <span className="font-mono text-[10px] text-ink-faint">{sh.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Motion durations -- ease-out only, no spring, ever (Editorial Paper)
        </h2>
        <div className="flex flex-col gap-2 rounded border border-border bg-surface-raised p-4">
          {DURATIONS.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-16 font-mono text-[10px] text-ink-faint">{d.name}</span>
              <span className="font-mono text-[10px] text-ink-muted">{d.ms}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-sans text-xs uppercase tracking-wide text-ink-faint">
          Layout dimensions
        </h2>
        <div className="flex flex-col gap-2 rounded border border-border bg-surface-raised p-4">
          {LAYOUT_DIMS.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-32 font-mono text-[10px] text-ink-faint">{d.name}</span>
              <span className="font-mono text-[10px] text-ink-muted">{d.value}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
