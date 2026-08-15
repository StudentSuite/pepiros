"use client";

import { HelpCircle, X } from "lucide-react";
import type { Workspace } from "@/types/anchor";
import { pillarColor } from "@/components/ui/PillarChip";
import { presentEdgeKinds, presentNodeTypes, presentPillars, TIER_MEANINGS } from "@/lib/graph/legend";

/**
 * The key to the picture.
 *
 * Collapsed by default: this is reference, not something to read every visit,
 * and a permanently-open panel is one more thing competing with the graph.
 * It only lists what this workspace actually draws (lib/graph/legend.ts), so
 * a two-paper graph is not handed a key for five kinds of line it does not
 * contain.
 *
 * Open state is owned by GraphCanvas rather than here, because opening the
 * panel has to re-fit the viewport: at 1400px wide this covers ~290px of the
 * canvas, which was enough to hide an entire paper column behind it.
 */
export function CanvasLegend({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setOpen = onOpenChange;

  const edgeKinds = presentEdgeKinds(workspace);
  const pillars = presentPillars(workspace);
  const nodeTypes = presentNodeTypes(workspace);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-raised px-3 py-1.5 font-sans text-xs text-ink-muted shadow-e-2 transition-colors duration-fast ease-out hover:text-ink"
      >
        <HelpCircle className="size-3.5" aria-hidden />
        What am I looking at?
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 max-h-[min(70vh,32rem)] w-72 overflow-y-auto rounded-lg border border-border-strong bg-surface-raised shadow-e-3">
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-raised px-3 py-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          Reading this graph
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close legend"
          className="rounded p-0.5 text-ink-faint transition-colors duration-fast hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        <Section title="Cards">
          {nodeTypes.map((n) => (
            <Row key={n.type} label={n.label} meaning={n.meaning} />
          ))}
        </Section>

        {pillars.length > 0 && (
          <Section title="Colours">
            <p className="mb-1.5 font-sans text-[11px] leading-relaxed text-ink-faint">
              A colour is a theme. A claim carries its pillar&rsquo;s colour, so
              you can see what a line belongs to without following it.
            </p>
            {pillars.map((p) => (
              <div key={p.index} className="flex items-center gap-2 py-0.5">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: pillarColor(p.index) }}
                  aria-hidden
                />
                <span className="font-sans text-[11px] text-ink">{p.title}</span>
              </div>
            ))}
          </Section>
        )}

        <Section title="Lines">
          {edgeKinds.map((e) => (
            <div key={e.kind} className="py-0.5">
              <div className="flex items-center gap-2">
                <svg width="22" height="6" viewBox="0 0 22 6" aria-hidden className="shrink-0">
                  <line
                    x1="0"
                    y1="3"
                    x2="22"
                    y2="3"
                    stroke={
                      e.kind === "agrees"
                        ? "var(--located)"
                        : e.kind === "contradicts"
                          ? "var(--unsupported)"
                          : e.kind === "contains"
                            ? "var(--border-strong)"
                            : "var(--ink-muted)"
                    }
                    strokeWidth={e.group === "judgement" ? 2 : 1.25}
                    strokeDasharray={e.dash ?? undefined}
                  />
                </svg>
                <span className="font-sans text-[11px] font-medium text-ink">{e.label}</span>
              </div>
              <p className="ml-[30px] font-sans text-[11px] leading-relaxed text-ink-faint">
                {e.meaning}
              </p>
            </div>
          ))}
        </Section>

        <Section title="Badges">
          {TIER_MEANINGS.map((t) => (
            <div key={t.tier} className="py-0.5">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--${t.tier.replace("quote_located", "located")})` }}
                  aria-hidden
                />
                <span className="font-sans text-[11px] font-medium text-ink">{t.label}</span>
              </div>
              <p className="ml-[18px] font-sans text-[11px] leading-relaxed text-ink-faint">
                {t.meaning}
              </p>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, meaning }: { label: string; meaning: string }) {
  return (
    <div className="py-0.5">
      <span className="font-sans text-[11px] font-medium text-ink">{label}</span>
      <p className="font-sans text-[11px] leading-relaxed text-ink-faint">{meaning}</p>
    </div>
  );
}
