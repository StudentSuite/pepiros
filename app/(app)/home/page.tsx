import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Clock } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { Card, CardContent } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Home" };

/**
 * Reader-first home.
 *
 * Calm on purpose: leads with the account's own recent published papers
 * rather than with metrics -- those live one click away on /analytics. Only
 * what the data model can honestly support appears here, so there is no
 * streak, no reading time, no activity feed, and (issue #92) no "continue
 * reading" card either: there is no per-account tracking of which
 * workspace/paper a signed-in user was reading (types/anchor.ts's
 * Workspace has no ownerId, and there's no reading-progress table at all),
 * so a card claiming specific resume-progress was always fabricated,
 * regardless of what the signed-in account had actually done.
 */
export default async function HomePage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const adapter = getAdapter();
  const posts = await adapter.listPosts(profile.id);
  const published = posts.filter((p) => p.status === "published");
  const recent = published.slice(0, 6);
  const reach = await adapter.getReach(profile.id, "30d");

  return (
    <div className="mx-auto w-full max-w-5xl p-s-5">
      <PageHeader
        title={`Welcome back, ${profile.displayName.split(" ")[0]}`}
        description="Your published papers, and how they're doing."
        primaryAction={{ label: "Add a paper", href: "/upload" }}
      />

      {/* Recent papers */}
      <section className="mt-s-5">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            Your recent papers
          </h2>
          <Link
            href="/posts"
            className="font-sans text-xs text-accent-text underline underline-offset-2"
          >
            See all
          </Link>
        </div>

        {recent.length === 0 ? (
          // Issue #140: every sibling page (workspaces/comments/posts/
          // analytics) handles zero-items via EmptyState -- this was the
          // one gap, a header over a blank rectangle with no CTA for a
          // fresh account right after onboarding.
          <div className="mt-s-3">
            <EmptyState
              icon={BookOpen}
              title="No published papers yet."
              description="Publish a paper to see it here, alongside how it's doing."
              action={{ label: "Add a paper", href: "/upload" }}
            />
          </div>
        ) : (
        <div className="mt-s-3 grid gap-s-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((post) => (
            <Card key={post.id} className="border-border bg-card">
              <CardContent className="flex h-full flex-col p-s-4">
                <div className="flex flex-wrap items-center gap-x-s-2 gap-y-1">
                  <Badge variant="outline" className="shrink-0 whitespace-nowrap font-mono text-[10px]">
                    {post.field}
                  </Badge>
                  {post.openAccess && (
                    <Badge
                      variant="outline"
                      className="shrink-0 whitespace-nowrap border-pillar-7/40 font-mono text-[10px] text-pillar-text-7"
                    >
                      Open access
                    </Badge>
                  )}
                </div>
                <h3 className="mt-s-3 line-clamp-3 font-serif text-sm leading-snug text-ink">
                  {post.title}
                </h3>
                <p className="mt-s-2 line-clamp-1 font-mono text-[11px] text-ink-faint">
                  {post.authors[0]}
                  {post.authors.length > 1 ? " et al." : ""} · {post.year}
                </p>
                <div className="mt-auto flex items-center gap-s-3 pt-s-3 font-mono text-[10px] text-ink-faint">
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3" />
                    {Math.round(post.groundingCoverage * 100)}% grounded
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {post.publishedAt}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </section>

      {/* Metrics are deliberately demoted to a single quiet strip. */}
      <section className="mt-s-6 rounded-md border border-border bg-card p-s-4">
        <div className="flex flex-wrap items-center gap-s-6 font-mono text-xs text-ink-muted">
          <span>
            <span className="text-ink">{reach.totalViews.toLocaleString()}</span> views
            this month
          </span>
          <span>
            <span className="text-ink">{published.length}</span> published
          </span>
          <span>
            <span className="text-ink">{profile.followerCount.toLocaleString()}</span>{" "}
            followers
          </span>
          <Link
            href="/analytics"
            className="ml-auto text-accent-text underline underline-offset-2"
          >
            Full analytics
          </Link>
        </div>
      </section>
    </div>
  );
}
