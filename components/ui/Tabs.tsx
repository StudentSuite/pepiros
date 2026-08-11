import clsx from "clsx";

export interface TabItem {
  value: string;
  label: string;
  badge?: number;
}

/**
 * Tab-list UI only -- content stays owned by the consumer (matches how
 * NodeInspector already switches its content block, this just replaces the
 * hand-rolled button loop with a shared, accessible one: role="tablist",
 * aria-selected, keyboard left/right between tabs).
 */
export function Tabs({
  tabs,
  value,
  onChange,
  trailing,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Extra content at the end of the tab row, e.g. NodeInspector's Edit button. */
  trailing?: React.ReactNode;
}) {
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    onChange(tabs[next]!.value);
  }

  return (
    <div role="tablist" className="flex items-center gap-1 border-b border-border pb-2">
      {tabs.map((tab, i) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          tabIndex={value === tab.value ? 0 : -1}
          onClick={() => onChange(tab.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
          className={clsx(
            "rounded px-2 py-1 font-sans text-xs capitalize transition duration-fast ease-out",
            "focus-visible:outline-none focus-visible:shadow-glow-accent",
            value === tab.value ? "bg-surface-raised text-ink" : "text-ink-muted hover:text-ink",
          )}
        >
          {tab.label} {tab.badge ? `(${tab.badge})` : ""}
        </button>
      ))}
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
