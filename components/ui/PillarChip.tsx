import clsx from "clsx";

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
 * Pillar colour is a structural system (plan.md §10), not decorative --
 * this chip, node borders, and edge strokes for the same pillar all pull
 * from the same `pillarColor()` so they read as one thread on the canvas.
 */
export function PillarChip({ pillarIndex, label, className }: { pillarIndex: number | null; label: string; className?: string }) {
  const color = pillarColor(pillarIndex);
  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-sans", className)}
      style={{ borderColor: color, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  );
}
