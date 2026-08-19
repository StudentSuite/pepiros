"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useWorkspaceStore } from "@/lib/store/workspace";
import type { Chunk, Numeric, Paper } from "@/types/anchor";

// Fixed categorical order, pulled from the design system's own pillar ramp
// rather than inventing new chart colors -- one hue per role, in the order
// roles are first encountered in the data (not cycled per-series).
const ROLE_COLORS = ["var(--pillar-1)", "var(--pillar-2)", "var(--pillar-3)", "var(--pillar-4)"];

function paperLabel(paper: Paper | undefined): string {
  if (!paper) return "unknown";
  const lastAuthor = paper.authors[0]?.split(" ").at(-1) ?? paper.title;
  return `${lastAuthor}${paper.year ? ` ${paper.year}` : ""}`;
}

interface RoleDatum {
  label: string;
  value: number;
  rawText: string;
}

/**
 * One small bar chart per numeric `role` (effect_size, p, ...), plotting
 * value by paper -- never both roles on one dual-axis chart, since a
 * p-value and an effect size don't share a scale or a unit. Sourced
 * straight from workspace.numerics; zero new backend logic.
 */
export function NumericChart() {
  const workspace = useWorkspaceStore((s) => s.workspace);

  if (!workspace) {
    return <p className="font-sans text-xs text-ink-faint">Loading workspace...</p>;
  }

  const chunkById = new Map<string, Chunk>(workspace.chunks.map((c) => [c.id, c]));
  const paperById = new Map<string, Paper>(workspace.papers.map((p) => [p.id, p]));

  const roles: string[] = [];
  for (const n of workspace.numerics) {
    if (!roles.includes(n.role)) roles.push(n.role);
  }

  if (roles.length === 0) {
    return <p className="font-sans text-xs text-ink-faint">No numerics in this workspace.</p>;
  }

  function dataForRole(role: string): RoleDatum[] {
    return workspace!.numerics
      .filter((n: Numeric) => n.role === role)
      .map((n) => {
        const chunk = chunkById.get(n.chunkId);
        const paper = chunk ? paperById.get(chunk.paperId) : undefined;
        return { label: paperLabel(paper), value: n.value, rawText: n.rawText };
      });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Always stacked: this only ever renders in the reader's 18rem sidebar
          rail, never a full-width area, so a viewport-based sm:grid-cols-2
          squeezed two full bar charts (axes, tick labels) into ~130px each. */}
      <div className="grid gap-4 grid-cols-1">
        {roles.map((role, i) => {
          const data = dataForRole(role);
          const color = ROLE_COLORS[i % ROLE_COLORS.length]!;
          return (
            <div key={role} className="rounded border border-border bg-surface-raised p-3">
              <h4 className="mb-2 font-sans text-xs uppercase tracking-wide text-ink-faint">
                {role.replace(/_/g, " ")}
              </h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--ink-faint)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-sunken)" }}
                    contentStyle={{
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "var(--ink)",
                    }}
                    formatter={(_value, _name, item?: { payload?: RoleDatum }) => [
                      item?.payload?.rawText ?? "",
                      role.replace(/_/g, " "),
                    ]}
                  />
                  <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40}>
                    <LabelList
                      dataKey="rawText"
                      position="top"
                      style={{ fill: "var(--ink-muted)", fontSize: 10 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>

      {/* Accessible table fallback -- same data as the charts above. */}
      <table className="w-full border-collapse font-sans text-xs">
        <caption className="sr-only">Numeric values by role and paper</caption>
        <thead>
          <tr className="border-b border-border text-left text-ink-faint">
            <th className="py-1 pr-3 font-normal">Paper</th>
            <th className="py-1 pr-3 font-normal">Role</th>
            <th className="py-1 pr-3 font-normal">Value</th>
          </tr>
        </thead>
        <tbody>
          {workspace.numerics.map((n) => {
            const chunk = chunkById.get(n.chunkId);
            const paper = chunk ? paperById.get(chunk.paperId) : undefined;
            return (
              <tr key={n.id} className="border-b border-border/50 text-ink-muted">
                <td className="py-1 pr-3">{paperLabel(paper)}</td>
                <td className="py-1 pr-3">{n.role.replace(/_/g, " ")}</td>
                <td className="py-1 pr-3 font-mono">{n.rawText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
