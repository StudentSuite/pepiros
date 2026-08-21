import { CATALOG, isOpenAccess } from "./papers";
import type {
  Comment,
  OnboardingResponse,
  Post,
  PostMetrics,
  Profile,
  RangeKey,
  ReachSummary,
} from "./types";
import { RANGE_DAYS } from "./types";

/**
 * Deterministic seeded data for the guest demo account.
 *
 * DETERMINISM IS THE WHOLE POINT. This renders on the server and again on the
 * client, so anything random would produce a hydration mismatch, and any number
 * derived from `Date.now()` would drift between the two renders (and change on
 * every reload, which makes a "reach" dashboard look broken). So:
 *
 *   - all randomness comes from mulberry32 seeded off a stable string key
 *   - "today" is a FIXED constant, not the wall clock
 *
 * The tradeoff is that the demo data does not advance over time. For a demo
 * account that is correct: a judge reloading the page should see the same
 * numbers they saw a second ago.
 */

/** Fixed reference date. Never use the wall clock in this file. */
const SEED_TODAY = new Date("2026-08-14T00:00:00Z");

/** xmur3 string hash, used to turn a stable key into a 32-bit seed. */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32: small, fast, and stable across engines. */
function rng(key: string): () => number {
  let a = hashSeed(key);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const intBetween = (r: () => number, lo: number, hi: number) =>
  Math.floor(r() * (hi - lo + 1)) + lo;

const pick = <T>(r: () => number, arr: readonly T[]): T => {
  // callers always pass a non-empty array; index is clamped for
  // noUncheckedIndexedAccess
  const i = Math.min(arr.length - 1, Math.floor(r() * arr.length));
  return arr[i] as T;
};

function daysAgo(n: number): string {
  const d = new Date(SEED_TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Guest identity
// ---------------------------------------------------------------------------

export const GUEST_USERNAME = "guest";
export const GUEST_PASSWORD = "guest";
export const GUEST_ID = "u-guest";

export const GUEST_PROFILE: Profile = {
  id: GUEST_ID,
  username: "guest",
  displayName: "Guest Reader",
  bio: "A demo account. Everything here is generated so you can see how a real Pepiros account behaves without signing up.",
  avatarInitials: "GR",
  followerCount: 1284,
  followingCount: 96,
  joinedAt: "2026-03-02",
  onboarded: true,
};

export const GUEST_ONBOARDING: OnboardingResponse = {
  profileId: GUEST_ID,
  country: "India",
  referralSource: "github",
  referralOther: null,
  role: "grad_student",
  fields: ["Machine learning", "Neuroscience", "Clinical medicine"],
  intent: "verify_before_citing",
  experience: "weekly",
  agentTools: ["claude", "cursor"],
  completedAt: "2026-03-02",
};

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/** The guest account has published the first 14 catalogue papers. */
const GUEST_POST_COUNT = 14;

export function seedPosts(authorId = GUEST_ID): Post[] {
  return CATALOG.slice(0, GUEST_POST_COUNT).map((paper, i) => {
    const r = rng(`post:${paper.id}`);
    // most published, a couple of drafts and one archived, so the tabs and
    // status filter have something real to separate
    const status =
      i === 4 ? "draft" : i === 9 ? "draft" : i === 12 ? "archived" : "published";
    return {
      id: `post-${paper.id}`,
      authorId,
      paperId: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      venue: paper.venue,
      field: paper.field,
      // Issue #285: the Post-level boolean is derived from the catalog's real
      // licence, so an unverified entry is never published as open access.
      openAccess: isOpenAccess(paper.licence),
      sourceUrl: paper.sourceUrl,
      status,
      publishedAt: daysAgo(intBetween(r, 3, 160)),
      // Issue #282: these are verifier outputs. A seeded post has never been
      // through the verifier, so it has no value to report and says so with
      // null rather than an invented one.
      groundingCoverage: null,
      dropRate: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/**
 * A post's daily series. Shape is deliberately not flat: a launch spike that
 * decays, plus weekly seasonality, because a dashboard of pure noise tells you
 * nothing about whether the chart component actually works.
 */
export function seedMetrics(postId: string, days: number): PostMetrics {
  const r = rng(`metrics:${postId}`);
  const cr = rng(`c:${postId}`);
  const base = intBetween(r, 8, 140);
  const spikeDay = intBetween(r, 0, Math.max(0, days - 1));

  const series: PostMetrics["series"] = [];
  let views = 0;
  let likes = 0;
  let comments = 0;

  for (let i = days - 1; i >= 0; i--) {
    const dayIndex = days - 1 - i;
    const date = daysAgo(i);

    // weekly rhythm: quieter at weekends
    const dow = (dayIndex + 3) % 7;
    const weekly = dow === 5 || dow === 6 ? 0.62 : 1;

    // launch spike decaying over ~10 days
    const sinceSpike = Math.abs(dayIndex - spikeDay);
    const spike = sinceSpike < 10 ? 1 + (10 - sinceSpike) * 0.42 : 1;

    const jitter = 0.72 + r() * 0.56;
    const dayViews = Math.max(0, Math.round(base * weekly * spike * jitter));
    const dayLikes = Math.round(dayViews * (0.03 + r() * 0.05));
    // Issue #275: this used to be a single aggregate derived from the
    // *whole* `likes` total (summed over all `days`, which seedReach calls
    // with days*2 -- both the current and comparison window combined), so a
    // range toggle changed Views/Likes by the real selected-range amount
    // but left Comments quietly pooling both windows, ~2x inflated relative
    // to what Views/Likes represent for the same range. Computed per day
    // here instead, exactly like dayLikes, so seedReach's existing sum()
    // helper can scope it to just the current window the same way.
    const dayComments = Math.round(dayLikes * (0.12 + cr() * 0.2));

    series.push({ date, views: dayViews, likes: dayLikes, comments: dayComments });
    views += dayViews;
    likes += dayLikes;
    comments += dayComments;
  }

  return { postId, views, likes, comments, series };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

const COMMENTERS = [
  { name: "Priya Subramaniam", username: "priyasub", initials: "PS" },
  { name: "Jonas Weber", username: "jonasw", initials: "JW" },
  { name: "Hana Kimura", username: "hanak", initials: "HK" },
  { name: "Tomás Ferreira", username: "tferreira", initials: "TF" },
  { name: "Amara Okafor", username: "amarao", initials: "AO" },
  { name: "Wei Zhang", username: "weiz", initials: "WZ" },
  { name: "Elena Roux", username: "eroux", initials: "ER" },
] as const;

const COMMENT_BODIES = [
  "Traced the headline number back to the source sentence and it holds as quote located. Worth a read.",
  "The methods section deserves a closer look before anyone cites the top-line figure.",
  "Useful companion to two other papers in my workspace. The contradiction diff caught something I missed.",
  "One claim here comes back as inference rather than quote located, which is fair; the paper never states it that plainly.",
  "The limitations section undersells the confound. Flagging it for anyone building on this.",
  "Reading path ordering on this one is genuinely good, methods before results made it click.",
  "Checked this against the numeric ledger and the confidence interval matches. Nice.",
  "Would like to see the drop rate on the appendix sections, the main body is clean.",
] as const;

export function seedComments(posts: Post[]): Comment[] {
  const out: Comment[] = [];
  for (const post of posts) {
    const r = rng(`comments:${post.id}`);
    const n = intBetween(r, 0, 5);
    for (let i = 0; i < n; i++) {
      const who = pick(r, COMMENTERS);
      out.push({
        id: `cm-${post.id}-${i}`,
        postId: post.id,
        authorName: who.name,
        authorUsername: who.username,
        authorInitials: who.initials,
        body: pick(r, COMMENT_BODIES),
        createdAt: daysAgo(intBetween(r, 0, 45)),
        claimRef: r() > 0.6 ? `C${intBetween(r, 1, 24)}` : null,
        read: r() > 0.35,
      });
    }
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Catalogue engagement (the public feed)
// ---------------------------------------------------------------------------

export interface CatalogStats {
  paperId: string;
  score: number;
  comments: number;
  readers: number;
  postedDaysAgo: number;
  postedBy: string;
}

const POSTERS = [
  "priyasub",
  "jonasw",
  "hanak",
  "tferreira",
  "amarao",
  "weiz",
  "eroux",
  "guest",
] as const;

/**
 * Engagement figures for a catalogue paper.
 *
 * Derived from the paper id, so the feed shows the same numbers on the server
 * and on the client and does not reshuffle between renders. Older papers are
 * given more accumulated score, which is what makes a "Top" sort differ from a
 * "New" sort rather than producing the same order twice.
 */
export function seedCatalogStats(paperId: string, year: number): CatalogStats {
  const r = rng(`catalog:${paperId}`);
  const age = Math.max(0, 2026 - year);
  const ageBoost = 1 + Math.min(age, 12) * 0.42;

  const score = Math.round((intBetween(r, 40, 900) * ageBoost) / 2);
  return {
    paperId,
    score,
    comments: Math.round(score * (0.04 + r() * 0.09)),
    readers: Math.round(score * (2.1 + r() * 3.4)),
    postedDaysAgo: intBetween(r, 0, 210),
    postedBy: pick(r, POSTERS),
  };
}

/**
 * Discussion on a public paper page.
 *
 * Keyed off the paper id so a given paper always shows the same thread, which
 * matters because these render server-side and again on the client.
 */
export function seedPaperComments(paperId: string): Comment[] {
  const r = rng(`paper-comments:${paperId}`);
  const n = intBetween(r, 2, 5);
  const out: Comment[] = [];
  for (let i = 0; i < n; i++) {
    const who = pick(r, COMMENTERS);
    out.push({
      id: `pc-${paperId}-${i}`,
      postId: paperId,
      authorName: who.name,
      authorUsername: who.username,
      authorInitials: who.initials,
      body: pick(r, COMMENT_BODIES),
      createdAt: daysAgo(intBetween(r, 1, 60)),
      claimRef: r() > 0.5 ? `C${intBetween(r, 1, 9)}` : null,
      read: true,
    });
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Reach summary
// ---------------------------------------------------------------------------

export function seedReach(posts: Post[], range: RangeKey): ReachSummary {
  const days = RANGE_DAYS[range];
  const published = posts.filter((p) => p.status === "published");
  const metrics = published.map((p) => seedMetrics(p.id, days * 2));

  // Aggregate the most recent `days` as the current window, and the `days`
  // before that as the comparison window, so the deltas mean something.
  const series: ReachSummary["series"] = [];
  for (let i = 0; i < days; i++) {
    const idx = days + i;
    let views = 0;
    let likes = 0;
    let date = "";
    for (const m of metrics) {
      const point = m.series[idx];
      if (!point) continue;
      date = point.date;
      views += point.views;
      likes += point.likes;
    }
    if (date) series.push({ date, views, likes });
  }

  const sum = (from: number, to: number, key: "views" | "likes" | "comments") =>
    metrics.reduce((acc, m) => {
      let s = 0;
      for (let i = from; i < to; i++) s += m.series[i]?.[key] ?? 0;
      return acc + s;
    }, 0);

  const curViews = sum(days, days * 2, "views");
  const prevViews = sum(0, days, "views");
  const curLikes = sum(days, days * 2, "likes");
  const prevLikes = sum(0, days, "likes");

  const delta = (cur: number, prev: number) => (prev === 0 ? 0 : (cur - prev) / prev);

  // Issue #275: scoped to the current window via the same sum() helper
  // views/likes already use, instead of metrics.reduce'd whole-period
  // (days*2) totals -- see seedMetrics's own comment for why that was ~2x
  // inflated relative to what Views/Likes represent for the same range.
  const totalComments = sum(days, days * 2, "comments");
  const prevComments = sum(0, days, "comments");

  return {
    totalViews: curViews,
    totalLikes: curLikes,
    totalComments,
    followers: GUEST_PROFILE.followerCount,
    viewsDelta: delta(curViews, prevViews),
    likesDelta: delta(curLikes, prevLikes),
    // Was a synthetic delta(totalComments, totalComments * 0.88) -- an
    // arbitrary constant standing in because a properly range-scoped
    // previous-window total didn't exist yet. Now a real comparison, same
    // as viewsDelta/likesDelta.
    commentsDelta: delta(totalComments, prevComments),
    followersDelta: 0.043,
    series,
    perPost: published
      .map((p, i) => {
        const m = metrics[i];
        return {
          postId: p.id,
          title: p.title,
          views: m?.views ?? 0,
          likes: m?.likes ?? 0,
          comments: m?.comments ?? 0,
        };
      })
      .sort((a, b) => b.views - a.views),
  };
}
