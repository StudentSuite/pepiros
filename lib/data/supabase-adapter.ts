import { CATALOG, CATALOG_BY_SLUG } from "./papers";
import type { DataAdapter } from "./adapter";
import type {
  Comment,
  Post,
  Profile,
  RangeKey,
  ReachSummary,
  ResearchField,
} from "./types";
import { RANGE_DAYS } from "./types";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

/**
 * Postgres-backed implementation, against supabase/migrations/0001_platform.sql
 * and the guest seed in 0002_guest_seed.sql.
 *
 * WHY OWNER-SCOPED READS USE THE SERVICE CLIENT.
 *
 * Sessions here are a custom HMAC-signed cookie (lib/auth/session.ts), not a
 * Supabase JWT. Supabase Auth is used only to check the password. That means
 * `auth.uid()` is NULL on every query made with the anon client, so the
 * owner-scoped RLS policies match nothing:
 *
 *   - `post_metrics_read_own` returns zero rows, and the analytics dashboard
 *     renders empty
 *   - `posts_read_published` hides the caller's own drafts and archived posts,
 *     so those status tabs are always empty
 *
 * So reads belonging to the signed-in user go through the service client, which
 * bypasses RLS. THE EXPLICIT author_id FILTER IS THEREFORE LOAD-BEARING, not a
 * redundant belt-and-braces check: it is the only thing scoping these queries to
 * one account. Every such query takes its authorId from the verified session,
 * never from client input. Do not add a method here that accepts an id straight
 * off the wire and hands it to the service client.
 *
 * Genuinely public reads (a profile by username) stay on the anon client, where
 * RLS still applies.
 *
 * Nothing is constructed at module load; clients are created per call, so
 * importing this file has no side effects and requires no env vars until a
 * method is actually invoked.
 */

const asProfile = (row: {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_initials: string;
  onboarded: boolean;
  created_at: string;
  followers?: number;
  following?: number;
}): Profile => ({
  id: row.id,
  username: row.username,
  displayName: row.display_name,
  bio: row.bio,
  avatarInitials: row.avatar_initials,
  followerCount: row.followers ?? 0,
  followingCount: row.following ?? 0,
  joinedAt: row.created_at.slice(0, 10),
  onboarded: row.onboarded,
});

export const supabaseAdapter: DataAdapter = {
  kind: "supabase",

  async verifyCredentials(username, password) {
    // Supabase Auth owns credentials; usernames map to an email alias.
    const sb = await createSupabaseServerClient();
    const { data: profileRow } = await sb
      .from("profiles")
      .select("id, username")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();
    if (!profileRow) return null;

    const { error } = await sb.auth.signInWithPassword({
      email: `${profileRow.username}@users.pepiros.dev`,
      password,
    });
    if (error) return null;

    return this.getProfile(profileRow.id);
  },

  async getProfile(id) {
    // service client: see the header note on auth.uid() being null here
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? asProfile(data) : null;
  },

  async getProfileByUsername(username) {
    const sb = await createSupabaseServerClient();
    const { data } = await sb
      .from("profiles")
      .select("*")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    return data ? asProfile(data) : null;
  },

  async getOnboarding(profileId) {
    const sb = createSupabaseServiceClient();
    const { data } = await sb
      .from("onboarding_responses")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!data) return null;
    return {
      profileId: data.profile_id,
      country: data.country,
      referralSource: data.referral_source,
      referralOther: data.referral_other,
      role: data.role,
      fields: (data.fields ?? []) as ResearchField[],
      intent: data.intent,
      experience: data.experience,
      agentTools: data.agent_tools ?? [],
      completedAt: data.completed_at,
    };
  },

  async saveOnboarding(response) {
    const sb = createSupabaseServiceClient();
    await sb.from("onboarding_responses").upsert({
      profile_id: response.profileId,
      country: response.country,
      referral_source: response.referralSource,
      referral_other: response.referralOther,
      role: response.role,
      fields: response.fields,
      intent: response.intent,
      experience: response.experience,
      agent_tools: response.agentTools,
      completed_at: response.completedAt,
    });
    await sb.from("profiles").update({ onboarded: true }).eq("id", response.profileId);
  },

  async listPosts(authorId) {
    const sb = createSupabaseServiceClient();
    const { data } = await sb
      .from("posts")
      .select("*")
      .eq("author_id", authorId)
      .order("published_at", { ascending: false, nullsFirst: false });

    return (data ?? []).map(
      (row): Post => ({
        id: row.id,
        authorId: row.author_id,
        paperId: row.paper_id,
        title: row.title,
        authors: row.authors ?? [],
        year: row.year ?? 0,
        venue: row.venue ?? "",
        field: row.field ?? "Machine learning",
        openAccess: row.open_access,
        sourceUrl: row.source_url ?? "",
        status: row.status,
        publishedAt: (row.published_at ?? row.created_at).slice(0, 10),
        groundingCoverage: Number(row.grounding_coverage ?? 0),
        dropRate: Number(row.drop_rate ?? 0),
      }),
    );
  },

  async deletePost(authorId, postId) {
    const sb = createSupabaseServiceClient();
    // author_id is also enforced by RLS; restating it here means a policy
    // regression cannot silently widen this into a delete-anything call.
    await sb.from("posts").delete().eq("id", postId).eq("author_id", authorId);
  },

  async listComments(authorId) {
    const sb = createSupabaseServiceClient();
    const { data } = await sb
      .from("comments")
      .select("*, posts!inner(author_id), profiles!inner(username, display_name, avatar_initials)")
      .eq("posts.author_id", authorId)
      .order("created_at", { ascending: false });

    return (data ?? []).map(
      (row): Comment => ({
        id: row.id,
        postId: row.post_id,
        authorName: row.profiles?.display_name ?? "Unknown",
        authorUsername: row.profiles?.username ?? "unknown",
        authorInitials: row.profiles?.avatar_initials ?? "?",
        body: row.body,
        createdAt: row.created_at.slice(0, 10),
        claimRef: row.claim_ref,
        read: row.read,
      }),
    );
  },

  async getReach(authorId, range: RangeKey) {
    const sb = createSupabaseServiceClient();
    const days = RANGE_DAYS[range];

    const posts = await this.listPosts(authorId);
    const published = posts.filter((p) => p.status === "published");
    const ids = published.map((p) => p.id);
    if (ids.length === 0) {
      return {
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        followers: 0,
        viewsDelta: 0,
        likesDelta: 0,
        commentsDelta: 0,
        followersDelta: 0,
        series: [],
        perPost: [],
      };
    }

    // Pull two windows at once so the deltas compare like with like.
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days * 2);

    const { data } = await sb
      .from("post_metrics")
      .select("post_id, day, views, likes, comments")
      .in("post_id", ids)
      .gte("day", since.toISOString().slice(0, 10))
      .order("day", { ascending: true });

    const rows = data ?? [];
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffDay = cutoff.toISOString().slice(0, 10);

    const byDay = new Map<string, { views: number; likes: number }>();
    const byPost = new Map<string, { views: number; likes: number; comments: number }>();
    let curViews = 0;
    let prevViews = 0;
    let curLikes = 0;
    let prevLikes = 0;
    let totalComments = 0;

    for (const r of rows) {
      const current = r.day >= cutoffDay;
      if (current) {
        const acc = byDay.get(r.day) ?? { views: 0, likes: 0 };
        acc.views += r.views;
        acc.likes += r.likes;
        byDay.set(r.day, acc);

        const p = byPost.get(r.post_id) ?? { views: 0, likes: 0, comments: 0 };
        p.views += r.views;
        p.likes += r.likes;
        p.comments += r.comments;
        byPost.set(r.post_id, p);

        curViews += r.views;
        curLikes += r.likes;
        totalComments += r.comments;
      } else {
        prevViews += r.views;
        prevLikes += r.likes;
      }
    }

    const { count: followers } = await sb
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("followee_id", authorId);

    const delta = (cur: number, prev: number) => (prev === 0 ? 0 : (cur - prev) / prev);
    const titleFor = new Map(published.map((p) => [p.id, p.title]));

    return {
      totalViews: curViews,
      totalLikes: curLikes,
      totalComments,
      followers: followers ?? 0,
      viewsDelta: delta(curViews, prevViews),
      likesDelta: delta(curLikes, prevLikes),
      commentsDelta: 0,
      followersDelta: 0,
      series: [...byDay.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([date, v]) => ({ date, views: v.views, likes: v.likes })),
      perPost: [...byPost.entries()]
        .map(([postId, v]) => ({
          postId,
          title: titleFor.get(postId) ?? "Untitled",
          views: v.views,
          likes: v.likes,
          comments: v.comments,
        }))
        .sort((a, b) => b.views - a.views),
    } satisfies ReachSummary;
  },

  // The public catalogue is static content, not database rows, so it is served
  // identically by both adapters.
  async listCatalog() {
    return CATALOG;
  },

  async getCatalogPaper(slug) {
    return CATALOG_BY_SLUG.get(slug) ?? null;
  },
};
