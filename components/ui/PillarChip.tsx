import { Badge } from "./Badge";

const PILLAR_COLOR_VAR = [
  "var(--pillar-1)",
  "var(--pillar-2)",
  "var(--pillar-3)",
  "var(--pillar-4)",
  "var(--pillar-5)",
  "var(--pillar-6)",
  "var(--pillar-7)",
] as const;

/** 1-indexed to match GraphNode.pillarIndex; index 0 renders neutral. */
export function pillarColor(pillarIndex: number | null): string {
  if (!pillarIndex) return "var(--ink-faint)";
  return PILLAR_COLOR_VAR[(pillarIndex - 1) % PILLAR_COLOR_VAR.length]!;
}

/**
 * A11y pass, docs/PLAN-V1.md §15: audited all 7 canonical pillar hues as
 * text on --surface-raised (the flagged risk, previously named against
 * pillar-2/pillar-6 specifically -- the whole palette changed under Stage
 * A2, so the actual failing hues shifted too). Dusk measured 3.41:1, Rose
 * 4.14:1, Teal 4.48:1 -- all below WCAG AA's 4.5:1 for normal text (border/
 * dot usage is fine, that threshold is 3:1 and every hue clears it). Use
 * this, not pillarColor(), wherever a pillar hue is the literal text
 * colour of real content -- borders, dots, and edge strokes keep the exact
 * canonical hex from the reference board.
 *
 * Reads the dedicated --pillar-N-text tokens (app/globals.css), which exist
 * for exactly this and are already redefined per theme (collapsed back onto
 * the raw fills in dark mode, where they already clear contrast). This used
 * to mix the fill 75% toward *white* instead, which lightens an
 * already-borderline hue -- the wrong direction on a light parchment
 * surface, and measured as low as 1.58:1 in practice.
 */
export function pillarTextColor(pillarIndex: number | null): string {
  if (!pillarIndex) return "var(--ink-faint)";
  const index = ((pillarIndex - 1) % PILLAR_COLOR_VAR.length) + 1;
  return `var(--pillar-${index}-text)`;
}

/**
 * Pillar colour is a structural system (plan.md §10), not decorative --
 * this chip, node borders, and edge strokes for the same pillar all pull
 * from the same `pillarColor()` so they read as one thread on the canvas.
 */
export function PillarChip({ pillarIndex, label, className }: { pillarIndex: number | null; label: string; className?: string }) {
  const color = pillarColor(pillarIndex);
  return (
    <Badge
      className={className}
      style={{ borderColor: color, color: pillarTextColor(pillarIndex) }}
      dotStyle={{ backgroundColor: color }}
    >
      {label}
    </Badge>
  );
}
