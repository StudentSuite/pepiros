import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, FileText, MessageSquare, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { buildActivityFeed, type ActivityEvent } from "@/lib/data/activity";
import { CHANGELOG } from "@/lib/data/changelog";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Home" };

/**
 * The signed-in dashboard, GitHub-shaped: your own items in a left rail, an
 * activity feed down the middle, what changed on the right.
 *
 * HONESTY CONSTRAINT, and it is the whole design. This app has no events
 * table and no reading history, so a dashboard is exactly the kind of surface
 * that gets filled with plausible-looking invention. It has happened twice
 * here already: a "continue reading" card with fabricated progress (issue
 * #92), and a grounding percentage rendered for posts that had never been
 * through the verifier (issue #282).
 *
 * So every row in the middle column is a record that already existed and
 * already carried a real date. See lib/data/activity.ts for what that admits
 * and what it rules out. The feed is thinner than GitHub's as a result. On a
 * product whose argument is "quote located, not verified", that is the right
 * side to err on.
 */

const ICONS: Record<ActivityEvent["kind"], React.ReactNode> = {
  published: <FileText className="size-3.5" />,
  comment: <MessageSquare className="size-3.5" />,
  catalog: <Sparkles className="size-3.5" />,
};

export default async function HomePage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const adapter = getAdapter();
  // Independent reads, so they go together rather than in series.
  const [posts, comments, reach] = await Promise.all([
    adapter.listPosts(profile.id),
    adapter.listComments(profile.id),
    adapter.getReach(profile.id, "30d"),
  ]);

  const published = posts.filter((p) => p.status === "published");
  const feed = buildActivityFeed({ posts, comments });
  const latest = CHANGELOG[0];

  return (
    <div className="mx-auto w-full max-w-6xl p-s-5">
      <PageHeader
        title={`Welcome back, ${profile.displayName.split(" ")[0]}`}
        description="What you have published, and what has happened since."
        primaryAction={{ label: "Add a paper", href: "/upload" }}
      />

      {/* Three columns at xl, two at lg (the changelog drops under the feed),
          one stacked below that. The rails are fixed and the feed takes the
          slack, so the feed's measure stays readable rather than stretching
          across a wide monitor. */}
      <div className="mt-s-6 grid gap-s-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        {/* Issue #314: only the right rail carried an explicit grid position
            (xl:col-start-3 xl:row-start-1); these two relied on plain
            auto-placement to land in columns 1/2 of the same row. Giving
            every item in this grid an explicit position removes any
            ambiguity between the auto-placed and explicitly-placed items
            for the browser's placement algorithm to resolve, regardless of
            how tall an empty-state's content makes any one column. */}
        {/* ---- Left rail: your own items ---------------------------------- */}
        <aside className="flex flex-col gap-s-5 xl:col-start-1 xl:row-start-1">
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="kicker">Your papers</h2>
              <Link
                href="/posts"
                className="font-sans text-xs text-accent-text underline underline-offset-2"
              >
                All {posts.length}
              </Link>
            </div>

            {published.length === 0 ? (
              <p className="mt-s-3 font-sans text-sm text-ink-muted">
                Nothing published yet.
              </p>
            ) : (
              <ul className="mt-s-3 flex flex-col">
                {published.slice(0, 6).map((post) => (
                  <li key={post.id} className="border-b border-border last:border-b-0">
                    <Link
                      href="/posts"
                      className="block py-s-2 transition-colors duration-fast ease-out hover:text-accent"
                    >
                      <span className="line-clamp-2 font-sans text-sm text-ink">
                        {post.title}
                      </span>
                      <span className="mt-[2px] block font-mono text-[11px] text-ink-faint">
                        {post.field} · {post.publishedAt}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Metrics stay a quiet strip rather than a row of big numbers: the
              real analytics are one click away and this is not that page. */}
          <section className="rounded-lg border border-border bg-surface-raised p-s-4">
            <h2 className="kicker">Last 30 days</h2>
            <dl className="mt-s-3 flex flex-col gap-s-2 font-mono text-xs text-ink-muted">
              <div className="flex items-baseline justify-between gap-s-3">
                <dt>Views</dt>
                <dd className="tabular-nums text-ink">{reach.totalViews.toLocaleString()}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-s-3">
                <dt>Published</dt>
                <dd className="tabular-nums text-ink">{published.length}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-s-3">
                <dt>Followers</dt>
                <dd className="tabular-nums text-ink">
                  {profile.followerCount.toLocaleString()}
                </dd>
              </div>
            </dl>
            <Link
              href="/analytics"
              className="mt-s-3 inline-block font-sans text-xs text-accent-text underline underline-offset-2"
            >
              Full analytics
            </Link>
          </section>
        </aside>

        {/* ---- Centre: the activity feed ---------------------------------- */}
        <section className="min-w-0 xl:col-start-2 xl:row-start-1">
          <h2 className="kicker">Recent activity</h2>

          {feed.length === 0 ? (
            <div className="mt-s-3">
              <EmptyState
                icon={BookOpen}
                title="Nothing has happened yet."
                description="Publish a paper, or open one from the catalog, and it shows up here."
                action={{ label: "Add a paper", href: "/upload" }}
              />
            </div>
          ) : (
            <ul className="mt-s-3 flex flex-col">
              {feed.map((event, i) => (
                <li
                  key={`${event.kind}-${event.href}-${i}`}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={event.href}
                    className="flex gap-s-3 py-s-4 transition-colors duration-fast ease-out hover:bg-surface-sunken"
                  >
                    <span
                      aria-hidden
                      className="mt-[3px] shrink-0 text-ink-faint"
                    >
                      {ICONS[event.kind]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-sm text-ink">{event.title}</span>
                      {event.detail && (
                        <span className="mt-[2px] block truncate font-sans text-[13px] text-ink-muted">
                          {event.detail}
                        </span>
                      )}
                    </span>
                    <time
                      dateTime={event.date}
                      className="shrink-0 font-mono text-[11px] text-ink-faint"
                    >
                      {event.date}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Right rail: what changed ------------------------------------
            Rendered only when there IS a changelog. CHANGELOG is hand-
            maintained, so an empty one is a real (if unlikely) state, and an
            empty panel headed "What's new" is worse than no panel. */}
        {latest && (
        <aside className="xl:col-start-3 xl:row-start-1">
          <section className="rounded-lg border border-border bg-surface-raised p-s-4">
            <div className="flex items-baseline justify-between">
              <h2 className="kicker">What&rsquo;s new</h2>
              <Link
                href="/changelog"
                className="font-sans text-xs text-accent-text underline underline-offset-2"
              >
                All
              </Link>
            </div>

            {/* Reads the same CHANGELOG the public /changelog page renders, so
                the two cannot disagree about what shipped. */}
            <p className="mt-s-3 font-mono text-[11px] text-ink-faint">{latest.date}</p>
            <h3 className="mt-s-1 font-sans text-sm font-semibold leading-snug text-ink">
              {latest.title}
            </h3>
            <ul className="mt-s-3 flex flex-col gap-s-2">
              {latest.items.slice(0, 4).map((item, i) => (
                <li
                  key={i}
                  className="border-l-2 border-border pl-s-3 font-sans text-[13px] leading-snug text-ink-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
        )}
      </div>
    </div>
  );
}
