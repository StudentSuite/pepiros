"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/shadcn/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Panel";
import { ToggleGroup, ToggleGroupItem } from "@/components/shadcn/toggle-group";
import { EmptyState } from "@/components/ui/EmptyState";
import type { RangeKey, ReachSummary } from "@/lib/data/types";

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

// Issue #304: repointed off pillar colours onto the dispersion palette.
// Pillar colours are semantic to a paper's own graph structure (each pillar
// is a real thematic grouping, docs/PLAN-V1.md §7) -- a generic dashboard
// metric has no pillar to be, so borrowing one implied a meaning that
// wasn't there. The dispersion tones (--disp-amber/green/violet,
// app/globals.css) are this rebuild's actual app-chrome accent set.
const lineConfig = {
  views: { label: "Views", color: "var(--disp-amber)" },
  likes: { label: "Likes", color: "var(--disp-green)" },
} satisfies ChartConfig;

const barConfig = {
  views: { label: "Views", color: "var(--disp-amber)" },
} satisfies ChartConfig;

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

/**
 * Reach over time.
 *
 * Kept to a plain line chart on purpose. Faint grid lines, real axis numbers,
 * the summary metric sitting above the plot so the number is readable without
 * interpreting the curve, and a range selector in the card header.
 */
export function ReachOverTime({
  reach,
  range,
  onRangeChange,
}: {
  reach: ReachSummary;
  range: RangeKey;
  onRangeChange: (r: RangeKey) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-s-4 space-y-0 pb-s-2">
        <div>
          <CardTitle className="whitespace-nowrap font-mono text-2xs font-normal uppercase tracking-widest text-ink-faint">
            Reach over time
          </CardTitle>
          <p className="mt-s-2 font-mono text-3xl tabular-nums leading-none text-ink">
            {reach.totalViews.toLocaleString()}
          </p>
          <p className="mt-s-1 font-sans text-xs text-ink-faint">
            views in the selected range
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={range}
          onValueChange={(v) => v && onRangeChange(v as RangeKey)}
          className="shrink-0"
        >
          {RANGES.map((r) => (
            <ToggleGroupItem
              key={r.value}
              value={r.value}
              aria-label={`Show ${r.label}`}
              className="px-s-2 font-mono text-2xs"
            >
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent className="pt-s-2">
        {reach.series.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No reach yet."
            description="Views and likes on your published papers show up here once they start coming in."
          />
        ) : (
        <ChartContainer config={lineConfig} className="h-[220px] w-full">
          <LineChart data={reach.series} margin={{ left: 4, right: 20, top: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={shortDate}
              className="font-mono text-2xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={38}
              tickFormatter={compact}
              className="font-mono text-2xs"
            />
            <ChartTooltip
              content={<ChartTooltipContent labelFormatter={(v) => shortDate(String(v))} />}
            />
            <Line
              dataKey="views"
              type="monotone"
              stroke="var(--color-views)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
            <Line
              dataKey="likes"
              type="monotone"
              stroke="var(--color-likes)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
            {/* Issue #276: Views/Likes were distinguished only by hue and a
                0.5px stroke-width difference -- the only place the mapping
                was spelled out was the hover tooltip, so a glance (or touch,
                or no-hover) couldn't tell the two lines apart. */}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Engagement per post.
 *
 * Hovering one bar dims the rest. That is the whole interaction: it answers
 * "which post is this" without needing a legend or a colour per series.
 */
export function EngagementByPost({ reach }: { reach: ReachSummary }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const data = reach.perPost.slice(0, 8).map((p, i) => ({
    ...p,
    index: i,
    // titles are full paper titles; the axis needs something readable
    short: p.title.length > 28 ? `${p.title.slice(0, 27)}…` : p.title,
  }));

  return (
    <Card>
      <CardHeader className="pb-s-2">
        <CardTitle className="font-mono text-2xs font-normal uppercase tracking-widest text-ink-faint">
          Engagement by post
        </CardTitle>
        <p className="mt-s-1 font-sans text-xs text-ink-faint">
          Top {data.length} by views
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No posts yet."
            description="Publish a paper and its per-post views will show up here."
          />
        ) : (
        <ChartContainer config={barConfig} className="h-[240px] w-full">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 4, right: 12 }}
            onMouseMove={(state) => {
              const idx = state?.activeTooltipIndex;
              setHovered(typeof idx === "number" ? idx : null);
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" strokeOpacity={0.7} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={compact}
              className="font-mono text-2xs"
            />
            <YAxis
              type="category"
              dataKey="short"
              tickLine={false}
              axisLine={false}
              width={150}
              className="font-sans text-2xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelKey="short" />}
            />
            <Bar dataKey="views" radius={3} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.postId}
                  fill="var(--color-views)"
                  // dim everything except the hovered bar
                  fillOpacity={hovered === null || hovered === d.index ? 1 : 0.28}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
