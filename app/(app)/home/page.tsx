import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { Card, CardContent } from "@/components/shadcn/card";
import { Badge } from "@/components/shadcn/badge";
import { Progress } from "@/components/shadcn/progress";
import { Button } from "@/components/shadcn/button";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Home" };

/**
 * Reader-first home.
 *
 * Calm on purpose: this is the screen someone lands on to READ, so it leads
 * with where they left off rather than with metrics. The numbers live one click
 * away on /analytics. Only what the data model can honestly support appears
 * here, so there is no streak, no reading time, and no activity feed.
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
        description="Pick up where you left off."
        primaryAction={{ label: "Add a paper", href: "/upload" }}
      />

      {/* Continue reading. The one thing this page exists for. */}
      <Card className="mt-s-5 border-border bg-card">
        <CardContent className="p-s-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-faint">
            Continue reading
          </p>
          <h2 className="mt-s-3 font-serif text-lg leading-snug text-ink">
            Circadian Rhythm &amp; Cognition
          </h2>
          <p className="mt-s-1 font-mono text-xs text-ink-faint">
            3 papers · last opened 2 hours ago
          </p>

          <div className="mt-s-4 max-w-sm">
            <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
              <span>Reading path</span>
              <span>3 of 8</span>
            </div>
            <Progress value={37} className="mt-s-2 h-1.5" />
          </div>

          <Button asChild size="sm" className="mt-s-4 gap-1.5">
            <Link href="/w/ws-1">
              Resume
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent papers */}
      <section className="mt-s-6">
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

        <div className="mt-s-3 grid gap-s-3 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((post) => (
            <Card key={post.id} className="border-border bg-card">
              <CardContent className="flex h-full flex-col p-s-4">
                <div className="flex items-center gap-s-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {post.field}
                  </Badge>
                  {post.openAccess && (
                    <Badge
                      variant="outline"
                      className="border-pillar-7/40 font-mono text-[10px] text-pillar-text-7"
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
