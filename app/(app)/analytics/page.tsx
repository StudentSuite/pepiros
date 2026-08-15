import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AnalyticsClient } from "@/components/dashboard/AnalyticsClient";
import type { RangeKey, ReachSummary } from "@/lib/data/types";

export const metadata: Metadata = { title: "Analytics" };

const RANGES: RangeKey[] = ["7d", "30d", "90d", "all"];

export default async function AnalyticsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const adapter = getAdapter();
  const entries = await Promise.all(
    RANGES.map(async (r) => [r, await adapter.getReach(profile.id, r)] as const),
  );
  const reachByRange = Object.fromEntries(entries) as Record<RangeKey, ReachSummary>;
  const comments = await adapter.listComments(profile.id);

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title="Analytics"
        description="How much reach your published papers are getting."
        primaryAction={{ label: "New post", href: "/upload" }}
      />
      <AnalyticsClient reachByRange={reachByRange} comments={comments} />
    </div>
  );
}
