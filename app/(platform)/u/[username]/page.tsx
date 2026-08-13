import type { Metadata } from "next";
import { PaperCard } from "@/components/site/PaperCard";
import { Reveal } from "@/components/ui/Reveal";
import { getMockProfile, type MockProfile } from "@/lib/mock/profile";
import { mockPapers, getMockPaperBySlug, type MockPaper } from "@/lib/mock/discover";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = getMockProfile(username);
  return {
    title: profile.displayName,
    description: profile.bio || `${profile.displayName} on Pepiros.`,
  };
}

// Light "recent activity" list -- 2-3 mock lines (Task 7 brief). Built from
// the profile's own `papers` plus one other paper from the catalog she
// didn't publish, so every title on screen is pulled from lib/mock/discover.ts
// rather than a second hardcoded copy of the same strings.
function buildActivity(profile: MockProfile): { text: string; timestamp: string }[] {
  const published = profile.papers
    .map((slug) => getMockPaperBySlug(slug))
    .filter((paper): paper is MockPaper => Boolean(paper));
  const commentedOn = mockPapers.find((paper) => !profile.papers.includes(paper.slug));

  const items: { text: string; timestamp: string }[] = [];
  if (published[0]) {
    items.push({ text: `Published "${published[0].title}"`, timestamp: "2 days ago" });
  }
  if (commentedOn) {
    items.push({ text: `Commented on "${commentedOn.title}"`, timestamp: "1 week ago" });
  }
  if (published[1]) {
    items.push({ text: `Published "${published[1].title}"`, timestamp: "3 weeks ago" });
  }
  return items;
}

/**
 * `/u/[username]` -- public profile. Server Component, same shape as
 * `/paper/[slug]`: no client interactivity needed here (no follow/like
 * controls on this surface per the Task 7 brief), so it stays fully server
 * rendered. `getMockProfile` returns the same fixed profile for any
 * username param, intentionally (Task 7 brief) -- this page never 404s.
 * Header/footer come from app/(platform)/layout.tsx.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = getMockProfile(username);
  const papers = profile.papers
    .map((slug) => getMockPaperBySlug(slug))
    .filter((paper): paper is MockPaper => Boolean(paper));
  const activity = buildActivity(profile);

  return (
    <main className="flex flex-col">
      {/* Header. Not wrapped in Reveal -- first thing on screen. */}
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pb-10 pt-20 sm:pt-28">
        <div className="flex items-center gap-4">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-raised font-mono text-2xl text-ink"
            aria-hidden="true"
          >
            {profile.avatarInitials}
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-serif text-2xl leading-tight text-ink sm:text-3xl">
              {profile.displayName}
            </h1>
            <p className="font-mono text-xs text-ink-faint">@{profile.username}</p>
          </div>
        </div>

        <p className="max-w-xl font-sans text-sm leading-relaxed text-ink-muted">{profile.bio}</p>

        <div className="flex items-center gap-6 font-mono text-xs text-ink-faint">
          <span>
            <span className="text-ink">{profile.followerCount}</span> followers
          </span>
          <span>
            <span className="text-ink">{profile.followingCount}</span> following
          </span>
        </div>
      </section>

      {/* Published papers. */}
      <Reveal>
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Published papers &middot; {papers.length}
            </p>
            {papers.length === 0 ? (
              <p className="mt-6 font-sans text-sm text-ink-faint">Nothing published yet.</p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {papers.map((paper) => (
                  <PaperCard key={paper.slug} paper={paper} />
                ))}
              </div>
            )}
          </div>
        </section>
      </Reveal>

      {/* Recent activity. */}
      <Reveal>
        <section className="border-t border-border bg-surface-sunken/40">
          <div className="mx-auto w-full max-w-3xl px-6 py-14">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
              Recent activity
            </p>
            <div className="mt-6 flex flex-col gap-3">
              {activity.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center justify-between gap-4 rounded border border-border bg-surface-raised px-4 py-3"
                >
                  <p className="font-sans text-sm text-ink-muted">{item.text}</p>
                  <p className="shrink-0 font-mono text-[10px] text-ink-faint">{item.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
