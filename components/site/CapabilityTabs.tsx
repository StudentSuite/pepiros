"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { LIVE_TOOLS, type ToolGroup } from "@/lib/mcp/registry";

/**
 * Block 7 (plan §6.1): "Tabs across the generator families and MCP tool
 * groups, each with a live panel."
 *
 * REAL DATA ONLY. Tabs are the four ToolGroup values LIVE_TOOLS itself uses
 * (lib/mcp/registry.ts), the same single source of truth /mcp already reads
 * from to avoid the tool-count drift that page's own header comment
 * documents (three different wrong counts in three places, before that
 * file existed). Each panel lists the real registered tools in that group,
 * not placeholder copy -- there is no separate "generator families" concept
 * anywhere else in this codebase to tab across, so this covers the MCP half
 * of that sentence honestly rather than inventing a second axis.
 */
const GROUPS: ToolGroup[] = ["Search and read", "Verify and write", "Audit", "Workspace and ingest"];

export function CapabilityTabs() {
  const [active, setActive] = useState<ToolGroup>(GROUPS[0]!);
  const tools = LIVE_TOOLS.filter((t) => t.group === active);

  return (
    <div>
      <Tabs
        tabs={GROUPS.map((g) => ({ value: g, label: g }))}
        value={active}
        onChange={(v) => setActive(v as ToolGroup)}
      />
      <div className="mt-s-5 flex flex-col gap-s-3">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="rounded-lg border border-l-[3px] border-border bg-surface-raised p-s-4 transition-colors duration-fast ease-out hover:border-accent/50"
            // Inline style, not a `border-l-accent` utility class: this box
            // already carries `border-border` (all four sides) from the base
            // Tailwind border-color utility, and whether a second, more
            // specific `.border-l-{color}` utility class wins the left edge
            // depends on Tailwind's internal generation order between two
            // different colour keys, which is not something to bet on
            // (`.paper-grain` vs `.absolute` fighting over `position` for
            // exactly this reason is the bug that taught this lesson earlier
            // this session). Inline style always wins the cascade, no bet
            // required. Was `var(--disp-amber)`, a hardcoded "default accent"
            // reach that predates the accent rule amendment -- now reads the
            // real accent token so it moves with any future re-derivation.
            style={{ borderLeftColor: "var(--accent)" }}
          >
            <div className="flex flex-wrap items-baseline gap-s-2">
              <code className="font-mono text-sm font-medium text-ink">{tool.name}</code>
              <span className="font-mono text-xs text-ink-faint">({tool.args})</span>
            </div>
            <p className="mt-s-1 font-sans text-sm leading-relaxed text-ink-muted">
              {tool.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
