import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getAdapter } from "@/lib/data/adapter";
import { Card } from "@/components/ui/Panel";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Comments" };

export default async function CommentsPage() {
  const profile = await getSession();
  if (!profile) redirect("/login");

  const adapter = getAdapter();
  const [comments, posts] = await Promise.all([
    adapter.listComments(profile.id),
    adapter.listPosts(profile.id),
  ]);
  const titleFor = new Map(posts.map((p) => [p.id, p.title]));
  const unread = comments.filter((c) => !c.read).length;

  // Issue #137: marks read using the state already fetched above, so "New"
  // badges below still reflect what was actually unread on arrival -- only
  // the next visit (here or the sidebar badge) sees the cleared count.
  if (unread > 0) await adapter.markCommentsRead(profile.id);

  return (
    <div className="mx-auto w-full max-w-4xl p-s-5">
      <PageHeader
        title="Comments"
        description={
          unread > 0
            ? `${unread} unread across your papers.`
            : "Everything here has been read."
        }
      />

      <Card className="mt-s-5">
        {comments.length === 0 ? (
          <div className="p-s-6">
            <EmptyState
              icon={MessageSquare}
              title="No comments yet."
              description="When someone responds to one of your papers, or to a single claim inside one, it shows up here."
              action={{ label: "See your posts", href: "/posts" }}
            />
          </div>
        ) : (
          <ul>
            {comments.map((c, i) => (
              <li
                key={c.id}
                className={i > 0 ? "border-t border-border" : undefined}
              >
                <div className="flex gap-s-3 p-s-4">
                  <Avatar className="mt-0.5 size-7 shrink-0">
                    <AvatarFallback className="bg-subtle font-mono text-[10px]">
                      {c.authorInitials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-s-2">
                      <Link
                        href={`/u/${c.authorUsername}`}
                        className="font-sans text-sm text-ink hover:text-accent-text"
                      >
                        {c.authorName}
                      </Link>
                      {!c.read && (
                        <Badge
                          variant="tag"
                          className="border-accent/40 uppercase tracking-wider text-accent-text"
                        >
                          New
                        </Badge>
                      )}
                      {c.claimRef && (
                        <Badge variant="tag">on {c.claimRef}</Badge>
                      )}
                      <span className="ml-auto font-mono text-[10px] text-ink-faint">
                        {c.createdAt}
                      </span>
                    </div>

                    <p className="mt-s-2 font-sans text-sm leading-relaxed text-ink-muted">
                      {c.body}
                    </p>

                    <p className="mt-s-2 truncate font-mono text-[11px] text-ink-faint">
                      {titleFor.get(c.postId) ?? "Unknown paper"}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
