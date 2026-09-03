import clsx from "clsx";

import { TokenValue } from "@/components/dev/TokenValue";
// The one section on this board that legitimately renders from hex rather
// than from a token (see the note below about why everything else does not).
// The shader ramp is not a token: it lives in the fragment module because
// that is the only thing that consumes it, and u_colors[4] needs real
// numbers. Importing it here keeps this board honest rather than typing the
// four values out a second time.
import {
  MESH_DRIFT_GRADIENT_STOPS,
  MESH_DRIFT_PALETTE_HEX,
} from "@/components/chrome/mesh-drift.frag";

/**
 * The live swatch board.
 *
 * Every colour on this page is rendered by the token itself, never by a hex
 * string typed here: a swatch is a `bg-*` utility and the hex printed beside
 * it is read back out of the same custom property at runtime. That is the
 * whole point of the page. If a token changes in app/globals.css this board
 * changes with it, and if a swatch here ever disagrees with the app, the bug
 * is in the token and not in the copy of it.
 *
 * Rebuilt 2026-08-23 for the dispersion palette. Walk it in BOTH themes.
 */

interface Swatch {
  name: string;
  /** The CSS custom property this swatch renders, e.g. "--surface". */
  token: string;
  className: string;
  textClassName?: string;
}

const SURFACES: Swatch[] = [
  { name: "surface", token: "--surface", className: "bg-surface" },
  { name: "surface-raised", token: "--surface-raised", className: "bg-surface-raised" },
  { name: "surface-sunken", token: "--surface-sunken", className: "bg-surface-sunken" },
];

const PAPER: Swatch[] = [
  { name: "paper", token: "--paper", className: "bg-paper" },
  { name: "paper-muted", token: "--paper-muted", className: "bg-paper-muted" },
];

const INK: Swatch[] = [
  { name: "ink", token: "--ink", className: "bg-ink", textClassName: "text-surface" },
  { name: "ink-muted", token: "--ink-muted", className: "bg-ink-muted", textClassName: "text-surface" },
  { name: "ink-faint", token: "--ink-faint", className: "bg-ink-faint", textClassName: "text-surface" },
];

const BORDER: Swatch[] = [
  { name: "border", token: "--border", className: "bg-border" },
  { name: "border-strong", token: "--border-strong", className: "bg-border-strong" },
];

const ACCENT: Swatch[] = [
  { name: "accent", token: "--accent", className: "bg-accent", textClassName: "text-paper" },
  { name: "accent-hover", token: "--accent-hover", className: "bg-accent-hover", textClassName: "text-paper" },
  { name: "accent-sunk", token: "--accent-sunk", className: "bg-accent-sunk", textClassName: "text-paper" },
];

/**
 * The dispersion palette.
 *
 * Amber, green and bone are ready-to-use secondary/decorative accents.
 *
 * Raw `--disp-violet` is still deliberately NOT given a `bg-` swatch here,
 * but the reason changed on 2026-08-23 and this comment was stale until
 * 2026-09-02 (issue #394). It is no longer "violet is atmosphere, never a
 * fill" -- THE ACCENT RULE in app/globals.css replaced the old purple rule,
 * and violet IS the primary interactive accent now.
 *
 * What holds is narrower and purely about contrast: raw --disp-violet
 * measures 3.06:1 against --paper and fails AA for anything text-bearing,
 * which is exactly why `--accent` is its own separately derived OKLCH ramp
 * at the same hue and chroma rather than an alias of this swatch. Giving the
 * raw value a flat `bg-` tile here would invite it to be used as one.
 *
 * The accent ramp that IS legal as a fill has its own section above.
 */
const DISPERSION: Swatch[] = [
  { name: "disp-amber", token: "--disp-amber", className: "bg-disp-amber" },
  { name: "disp-green", token: "--disp-green", className: "bg-disp-green" },
  { name: "disp-bone", token: "--disp-bone", className: "bg-disp-bone" },
];

// Full class names spelled out (not interpolated): Tailwind's JIT scanner
// needs the literal string in source, a template literal would not be seen.
// This also matches how the app actually applies pillar colour (inline style
// off pillarColor(), see components/ui/PillarChip.tsx); this grid alone uses
// the utility for a quick static preview.
const PILLARS: Swatch[] = [
  { name: "pillar-1 (sand)", token: "--pillar-1", className: "bg-pillar-1" },
  { name: "pillar-2 (amber)", token: "--pillar-2", className: "bg-pillar-2" },
  { name: "pillar-3 (clay)", token: "--pillar-3", className: "bg-pillar-3" },
  { name: "pillar-4 (rose)", token: "--pillar-4", className: "bg-pillar-4" },
  { name: "pillar-5 (green)", token: "--pillar-5", className: "bg-pillar-5" },
  { name: "pillar-6 (teal)", token: "--pillar-6", className: "bg-pillar-6" },
  { name: "pillar-7 (slate)", token: "--pillar-7", className: "bg-pillar-7" },
];

const PILLAR_TEXT: { name: string; token: string; className: string }[] = [
  { name: "pillar-text-1", token: "--pillar-1-text", className: "text-pillar-text-1" },
  { name: "pillar-text-2", token: "--pillar-2-text", className: "text-pillar-text-2" },
  { name: "pillar-text-3", token: "--pillar-3-text", className: "text-pillar-text-3" },
  { name: "pillar-text-4", token: "--pillar-4-text", className: "text-pillar-text-4" },
  { name: "pillar-text-5", token: "--pillar-5-text", className: "text-pillar-text-5" },
  { name: "pillar-text-6", token: "--pillar-6-text", className: "text-pillar-text-6" },
  { name: "pillar-text-7", token: "--pillar-7-text", className: "text-pillar-text-7" },
];

const TIERS: { name: string; token: string; className: string }[] = [
  { name: "located", token: "--located", className: "text-located" },
  { name: "paraphrase", token: "--paraphrase", className: "text-paraphrase" },
  { name: "unsupported", token: "--unsupported", className: "text-unsupported" },
  { name: "inference", token: "--inference", className: "text-inference" },
  { name: "ungrounded", token: "--ungrounded", className: "text-ungrounded" },
];

function SwatchGrid({ title, note, swatches }: { title: string; note?: string; swatches: Swatch[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="kicker">{title}</h2>
      {note && <p className="max-w-prose font-sans text-xs text-ink-muted">{note}</p>}
      <div className="flex flex-wrap gap-3">
        {swatches.map((s) => (
          <div key={s.name} className="flex flex-col gap-1">
            <div
              className={clsx(
                "flex h-16 w-36 items-end rounded-md border border-border p-1.5",
                s.className,
              )}
            >
              <span className={clsx("font-mono text-2xs", s.textClassName ?? "text-ink")}>
                {s.name}
              </span>
            </div>
            <TokenValue token={s.token} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Full class names spelled out (not interpolated), same JIT reason as above.
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
const DURATIONS: { name: string; token: string }[] = [
  { name: "fast", token: "--dur-fast" },
  { name: "base", token: "--dur-base" },
  { name: "slow", token: "--dur-slow" },
  { name: "canvas", token: "--dur-canvas" },
];
const LAYOUT_DIMS: { name: string; token: string }[] = [
  { name: "rail-left", token: "--rail-left" },
  { name: "panel-papers", token: "--panel-papers" },
  { name: "inspector", token: "--inspector" },
  { name: "chat-collapsed", token: "--chat-collapsed" },
  { name: "chat-open", token: "--chat-open" },
  { name: "topbar", token: "--topbar" },
];

export default function DesignTokensPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-s-6 p-s-5">
      <div>
        <p className="kicker">Design tokens</p>
        <h1 className="mt-1 font-sans text-3xl font-bold text-ink">The swatch board</h1>
        <p className="mt-s-2 max-w-prose font-sans text-sm text-ink-muted">
          Refractive dispersion on soft-body organic geometry. Purple is the environment the
          material refracts through: never a brand swatch, never a button. Every UI accent comes
          from the dispersion palette instead. Source of truth:{" "}
          <code className="font-mono text-xs">app/globals.css</code>, measured from{" "}
          <code className="font-mono text-xs">design/brand/README.txt</code> and{" "}
          <code className="font-mono text-xs">design/capsules/</code>.
        </p>
        <p className="mt-s-2 max-w-prose font-sans text-sm text-ink-muted">
          Hex values under each swatch are read back out of the live custom property, so this page
          cannot drift from the tokens. Walk it in both themes.
        </p>
      </div>

      <SwatchGrid title="Surfaces" swatches={SURFACES} />
      <SwatchGrid
        title="Reading surfaces"
        note="Opaque, always. Long-form text never sits on glass."
        swatches={PAPER}
      />
      <SwatchGrid title="Ink" swatches={INK} />
      <SwatchGrid title="Border" swatches={BORDER} />
      <SwatchGrid
        title="Accent"
        note="Dispersion violet, moved along its own OKLCH lightness ramp per theme. It is also a fill (Button primary is bg-accent text-paper), so it is dark in light mode and light in dark mode. Amended 2026-08-23 from amber; this note said amber until 2026-09-02."
        swatches={ACCENT}
      />
      <SwatchGrid
        title="Dispersion palette"
        note="Secondary and decorative accents. Raw violet is missing from this row on purpose, but not because violet is banned as a fill: it measures 3.06:1 against paper and fails AA, which is why --accent is a separately derived ramp at the same hue rather than an alias of it."
        swatches={DISPERSION}
      />

      <section className="flex flex-col gap-2">
        <h2 className="kicker">Dispersion gradient</h2>
        <div
          className="h-16 rounded-lg border border-border"
          style={{
            background:
              "linear-gradient(120deg, var(--disp-violet), var(--disp-green), var(--disp-amber))",
          }}
        />
        <TokenValue token="--disp-violet" />
      </section>

      {/* Issue #342. The loudest colour in the product was the one you could
          not inspect: this board covered every token but not the shader the
          hero and closing CTA are actually painted with. */}
      <section className="flex flex-col gap-3">
        <h2 className="kicker">Atmosphere ramp (shader)</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          The four stops <code className="font-mono">u_colors[4]</code> receives, from{" "}
          <code className="font-mono">MESH_DRIFT_PALETTE_HEX</code>. Repaletted 2026-09-02
          (issue #335). This is atmosphere only: it reaches the page through{" "}
          <code className="font-mono">&lt;Band&gt;</code> and{" "}
          <code className="font-mono">&lt;DispersionGlow&gt;</code> and is not connected to the
          token system. Nothing here is theme-aware, because the shader is not.
        </p>

        <div className="flex flex-wrap gap-2">
          {MESH_DRIFT_PALETTE_HEX.map((hex, i) => (
            <div key={hex} className="flex flex-col gap-1">
              <div
                className="flex h-16 w-32 items-end rounded-md border border-border p-1.5"
                style={{ background: hex }}
              >
                <span className="font-mono text-2xs text-brand-ink-reversed">stop {i}</span>
              </div>
              <span className="font-mono text-2xs text-ink-faint">{hex}</span>
            </div>
          ))}
        </div>

        <p className="max-w-prose font-sans text-xs text-ink-muted">
          The shader interpolates in OKLab; a CSS gradient interpolates in sRGB. The fallback
          below carries two extra OKLab-derived midpoints so the two paths agree (issue #339).
          Without them, green to orange passes through a muddy olive.
        </p>
        <div
          className="h-16 rounded-lg border border-border"
          style={{ backgroundImage: `linear-gradient(160deg, ${MESH_DRIFT_GRADIENT_STOPS})` }}
        />

        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Band text sits on the ramp behind a scrim. Below is the worst case the scrim is sized
          against: brand-ink-reversed over the ramp&rsquo;s lightest stop, at 55 percent, measured
          6.40:1 (issue #336). The right-hand tile is the same thing unscrimmed, for comparison.
        </p>
        <div className="flex flex-wrap gap-2">
          <div
            className="relative flex h-20 w-56 items-center justify-center overflow-hidden rounded-md border border-border"
            style={{ background: MESH_DRIFT_PALETTE_HEX[1] }}
          >
            <div className="absolute inset-0 bg-band-scrim/55" />
            <span className="relative font-sans text-sm text-brand-ink-reversed">
              scrimmed, 6.40:1
            </span>
          </div>
          <div
            className="flex h-20 w-56 items-center justify-center rounded-md border border-border"
            style={{ background: MESH_DRIFT_PALETTE_HEX[1] }}
          >
            <span className="font-sans text-sm text-brand-ink-reversed">unscrimmed, 1.62:1</span>
          </div>
        </div>
        <TokenValue token="--band-scrim" />
      </section>

      {/* Issue #370. Stacking was the one axis with no scale: eleven ad-hoc
          layers, z-50 alone holding ten unrelated components, and the two
          values above it picked to win specific fights. Listed here in the
          order they stack so the ordering is inspectable rather than folded
          into a CSS comment. The utilities are spelled out literally so
          Tailwind's scanner emits them. */}
      <section className="flex flex-col gap-2">
        <h2 className="kicker">Stacking order</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Lowest first. The rule reading down: the further down, the more the layer is about
          telling the reader something they did not ask to be told. Gaps of 10 so a layer can
          be slipped between two later without renumbering.
        </p>
        <div className="flex flex-col gap-1">
          {[
            ["z-raised", "--z-raised", "canvas hints, PdfPane counter, workspace sidebar"] as const,
            ["z-sticky", "--z-sticky", "in-page sticky strips, GuestBanner"],
            ["z-header", "--z-header", "a route's own header"],
            ["z-dock", "--z-dock", "SiteHeader, ChatDock"],
            ["z-overlay", "--z-overlay", "dialogs, drawers, sheets, popovers, menus"],
            ["z-nav", "--z-nav", "full-screen mobile nav"],
            ["z-toast", "--z-toast", "above nav, settles the old z-[60] tie"],
            ["z-banner", "--z-banner", "connectivity and system state"],
            ["z-skip", "--z-skip", "the skip link, top of the stack by definition"],
            // `as const` is load-bearing: tsconfig has noUncheckedIndexedAccess,
            // so destructuring a string[][] row hands back string | undefined.
          ].map(([cls, token, note]) => (
            <div
              key={token}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border py-1.5"
            >
              <code className="font-mono text-2xs text-accent-text">{cls}</code>
              <TokenValue token={token} />
              <span className="font-sans text-2xs text-ink-faint">{note}</span>
            </div>
          ))}
        </div>
        {/* Literal utilities so the JIT scanner sees them. Zero-size, purely
            to guarantee the classes above are emitted into the stylesheet. */}
        <div className="hidden">
          <span className="z-raised" />
          <span className="z-sticky" />
          <span className="z-header" />
          <span className="z-dock" />
          <span className="z-overlay" />
          <span className="z-nav" />
          <span className="z-toast" />
          <span className="z-banner" />
          <span className="z-skip" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="kicker">The isolated purple</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Reserved, and currently unreferenced by app code:{" "}
          <code className="font-mono">components/ui/Logo.tsx</code> now draws the kit glyph
          verbatim, which has no accent bar. It stays defined here because the kit&rsquo;s own
          og and social lockups use this exact value, so there is one place to change it.
        </p>
        <div className="flex flex-col gap-1">
          <div
            className="flex h-16 w-36 items-end rounded-md border border-border p-1.5"
            style={{ background: "var(--logo-quote-bar)" }}
          >
            <span className="font-mono text-2xs text-brand-ink-reversed">logo-quote-bar</span>
          </div>
          <TokenValue token="--logo-quote-bar" />
        </div>
      </section>

      <SwatchGrid
        title="Pillar fills (7 citation categories)"
        note="Structural, shared by nodes, edges and chips. FILLS ONLY: none of these clears AA as text on a light ground, which is what the -text ramp below exists for."
        swatches={PILLARS}
      />

      <section className="flex flex-col gap-2">
        <h2 className="kicker">Pillar text ramp</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Each is its fill&apos;s own hue and chroma walked in lightness until it cleared WCAG AA
          4.5:1 against every surface in the active theme. Read this row on both{" "}
          <code className="font-mono">surface</code> and <code className="font-mono">sunken</code>.
        </p>
        <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          <div className="flex flex-col gap-1 bg-surface p-s-3">
            <span className="kicker">on surface</span>
            {PILLAR_TEXT.map((p) => (
              <span key={p.name} className={clsx("font-mono text-sm", p.className)}>
                {p.name}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1 bg-surface-sunken p-s-3">
            <span className="kicker">on surface-sunken</span>
            {PILLAR_TEXT.map((p) => (
              <span key={p.name} className={clsx("font-mono text-sm", p.className)}>
                {p.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="kicker">Evidence tiers</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Never call any of these &ldquo;verified&rdquo;. The vocabulary is &ldquo;quote
          located&rdquo; for deterministic evidence and &ldquo;inference&rdquo; for model-generated
          reasoning.
        </p>
        <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-raised p-s-3">
          {TIERS.map((t) => (
            <div key={t.name} className="flex items-center gap-s-3">
              <span className={clsx("w-28 font-mono text-sm", t.className)}>{t.name}</span>
              <TokenValue token={t.token} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="kicker">Always-dark and always-light panes</h2>
        <p className="max-w-prose font-sans text-xs text-ink-muted">
          Two mirror-image classes pin a local ink ramp so a pane can ignore the active theme. A PDF
          is a light object in both themes; the audit rail is a dark one.
        </p>
        <div className="grid gap-s-3 sm:grid-cols-2">
          <div className="surface-reading rounded-md border border-border p-s-4">
            <p className="kicker">surface-reading</p>
            <p className="mt-1 font-serif text-sm text-ink">
              Long-form body copy sets in Source Serif 4, and only here.
            </p>
            <p className="mt-1 font-sans text-xs text-ink-muted">ink-muted on a pinned light pane</p>
          </div>
          <div className="surface-chrome rounded-md border border-border p-s-4">
            <p className="kicker">surface-chrome</p>
            <p className="mt-1 font-sans text-sm text-ink">The audit rail stays dark in both.</p>
            <p className="mt-1 font-mono text-xs text-pillar-text-5">quote located</p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Type families</h2>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-raised p-s-4">
          <p className="font-sans text-2xl font-bold text-ink">
            font-sans (Geist) -- UI, headlines, nav, buttons, the wordmark
          </p>
          <p className="font-serif text-lg text-ink">
            font-serif (Source Serif 4) -- long-form article and paper body copy ONLY. Never the
            wordmark, never a heading.
          </p>
          <p className="font-mono text-base text-ink">
            font-mono (Geist Mono) -- PEPIROS-2024-0917 p.14 quote located
          </p>
          <p className="kicker">.kicker -- the eyebrow, mono 11px 600 at 0.14em</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Buttons and evidence chips</h2>
        <div className="flex flex-wrap items-center gap-s-3 rounded-md border border-border bg-surface-raised p-s-4">
          <button
            type="button"
            className="rounded-full bg-accent px-s-5 py-s-2 font-sans text-sm font-semibold text-paper"
          >
            Primary pill
          </button>
          <button
            type="button"
            className="rounded-full border border-border-strong px-s-5 py-s-2 font-sans text-sm font-semibold text-ink"
          >
            Secondary pill
          </button>
          <span className="flex items-center gap-2 rounded-full border border-border px-s-3 py-s-1">
            <span className="size-[7px] rounded-full bg-pillar-5" />
            <span className="font-mono text-xs text-ink">quote located</span>
          </span>
          <span className="flex items-center gap-2 rounded-full border border-border px-s-3 py-s-1">
            <span className="size-[7px] rounded-full bg-pillar-1" />
            <span className="font-mono text-xs text-ink">inference</span>
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Material</h2>
        <div className="grid gap-s-3 sm:grid-cols-3">
          <div className="paper-grain relative h-32 overflow-hidden rounded-lg bg-surface-raised">
            <span className="absolute bottom-2 left-3 font-mono text-2xs text-ink">grain</span>
          </div>
          <div
            className="relative h-32 overflow-hidden rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--disp-violet), var(--disp-green), var(--disp-amber))",
            }}
          >
            <div className="glass absolute inset-0" />
            <span className="absolute bottom-2 left-3 font-mono text-2xs text-brand-ink-reversed">
              glass
            </span>
          </div>
          <div
            className="relative h-32 overflow-hidden rounded-lg"
            style={{
              background:
                "conic-gradient(from 120deg, var(--disp-violet), var(--disp-green), var(--disp-amber), var(--disp-violet))",
            }}
          >
            <span className="absolute bottom-2 left-3 font-mono text-2xs text-brand-ink-reversed">
              iridescence
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Spacing scale (s-1..8)</h2>
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface-raised p-s-4">
          {SPACING.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-1">
              <div className={clsx("h-4 bg-accent", s.className)} />
              <span className="font-mono text-2xs text-ink-faint">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Radius scale</h2>
        <div className="flex flex-wrap gap-3">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-1">
              <div className={clsx("h-12 w-12 bg-pillar-2", r.className)} />
              <span className="font-mono text-2xs text-ink-faint">{r.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Elevation</h2>
        <div className="flex flex-wrap gap-6">
          {SHADOWS.map((sh) => (
            <div key={sh.name} className="flex flex-col items-center gap-2">
              <div className={clsx("h-14 w-20 rounded-md bg-surface-raised", sh.className)} />
              <span className="font-mono text-2xs text-ink-faint">{sh.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Motion durations (ease-out only, never spring)</h2>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-s-4">
          {DURATIONS.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-16 font-mono text-2xs text-ink-faint">{d.name}</span>
              <TokenValue token={d.token} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="kicker">Layout dimensions</h2>
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-s-4">
          {LAYOUT_DIMS.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="w-32 font-mono text-2xs text-ink-faint">{d.name}</span>
              <TokenValue token={d.token} />
            </div>
          ))}
        </div>
      </section>

    </main>
  );
}
