import clsx from "clsx";

/** Mono-set chip for a stable citation id (C7, N12, e6, ...). */
export function RefChip({ refId, className }: { refId: string; className?: string }) {
  return (
    <span
      className={clsx(
        "rounded border border-border-strong bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-muted",
        className,
      )}
    >
      {refId}
    </span>
  );
}
