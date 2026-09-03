"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Panel";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "./StatCard";
import { EngagementByPost, ReachOverTime } from "./ReachCharts";
import type { Comment, RangeKey, ReachSummary } from "@/lib/data/types";

/**
 * The creator dashboard.
 *
 * Layout is the 2-column, 2-row grid from the brief: the chart that matters
 * most takes the largest cell, the headline numbers sit beside it, and the two
 * lower cells carry per-post engagement and the most recent comments.
 *
 * All four ranges are computed on the server and passed down together, so the
 * range selector is instant and needs no fetch. That is affordable because the
 * data is generated; against Supabase this would become a server round trip.
 */
export function AnalyticsClient({
  reachByRange,
  comments,
}: {
  reachByRange: Record<RangeKey, ReachSummary>;
  comments: Comment[];
}) {
  const [range, setRange] = useState<RangeKey>("30d");
  const reach = reachByRange[range];

  return (
    <div className="mt-s-5 grid grid-cols-1 gap-s-4 lg:grid-cols-3">
      {/* Row 1, large cell */}
      <div className="lg:col-span-2">
        <ReachOverTime reach={reach} range={range} onRangeChange={setRange} />
      </div>

      {/* Row 1, stat column */}
      <div className="grid grid-cols-2 gap-s-4 lg:grid-cols-1">
        <StatCard
          label="Views"
          value={reach.totalViews.toLocaleString()}
          delta={reach.viewsDelta}
          hint="vs previous period"
        />
        <StatCard
          label="Likes"
          value={reach.totalLikes.toLocaleString()}
          delta={reach.likesDelta}
          hint="vs previous period"
        />
        <StatCard
          label="Comments"
          value={reach.totalComments.toLocaleString()}
          delta={reach.commentsDelta}
          hint="across all posts"
        />
        <StatCard
          label="Followers"
          value={reach.followers.toLocaleString()}
          delta={reach.followersDelta}
          hint="all time"
        />
      </div>

      {/* Row 2, left */}
      <div className="lg:col-span-2">
        <EngagementByPost reach={reach} />
      </div>

      {/* Row 2, right */}
      <Card>
        <CardHeader className="pb-s-2">
          <CardTitle className="font-mono text-2xs font-normal uppercase tracking-widest text-ink-faint">
            Recent comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No comments yet."
              description="When someone responds to one of your papers, it lands here."
            />
          ) : (
            <ul className="flex flex-col">
              {comments.slice(0, 6).map((c, i) => (
                <li
                  key={c.id}
                  className={i > 0 ? "border-t border-border pt-s-3" : undefined}
                >
                  <div className={i > 0 ? "" : "pb-s-3"}>
                    <div className="flex items-center gap-s-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="bg-subtle font-mono text-2xs">
                          {c.authorInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-sans text-xs text-ink">{c.authorName}</span>
                      {c.claimRef && (
                        <span className="font-mono text-2xs text-ink-faint">
                          on {c.claimRef}
                        </span>
                      )}
                      <span className="ml-auto font-mono text-2xs text-ink-faint">
                        {c.createdAt}
                      </span>
                    </div>
                    <p className="mt-s-1 line-clamp-2 font-sans text-xs leading-relaxed text-ink-muted">
                      {c.body}
                    </p>
                  </div>
                  {i < 5 && i > 0 ? <div className="pb-s-3" /> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
