import { CATALOG, CATALOG_BY_SLUG } from "./papers";
import type { DataAdapter } from "./adapter";
import type {
  Comment,
  NotificationPrefs,
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

/** Matches components/settings/NotificationPrefs.tsx's previous hardcoded client-only defaults (issue #70). */
const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  follow: true,
  comment: true,
  like: false,
  digest: true,
};

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

function initialsFrom(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const supabaseAdapter: DataAdapter = {
  kind: "supabase",

  async createAccount({ username, password, displayName, email }) {
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      return {
        error: "Usernames are 3-30 characters: lowercase letters, numbers, and underscores only.",
      };
    }
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }

    // Issue #83: email used to be optional (issue #45), falling back to a
    // synthetic `${username}@users.pepiros.dev` placeholder that can never
    // receive mail -- which meant requestPasswordReset() had no real
    // address to send to, silently no-opped, and the UI still showed the
    // generic "check your email" success regardless (an enumeration-safe
    // *response* is correct; a structurally unrecoverable account is not).
    // Requiring a real email at the one point it's collected closes that
    // gap at the source instead of trying to special-case it later.
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { error: "Enter an email address so you can recover your password later." };
    }
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return { error: "Enter a valid email address." };
    }

    const sb = createSupabaseServiceClient();

    const { data: existing } = await sb
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();
    if (existing) {
      return { error: "That username is already taken." };
    }

    // Issue #84: email_confirm used to be unconditionally true -- a typo'd
    // address, or someone else's email entered by mistake or maliciously,
    // was permanently treated as verified, with no real confirmation click
    // ever required. false here defers to whatever this Supabase project's
    // own "Confirm email" auth setting says about whether an unconfirmed
    // user can sign in at all; either way, the account is no longer
    // unconditionally marked verified just because it was created.
    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
    });
    if (createError || !created.user) {
      return { error: createError?.message ?? "Could not create the account." };
    }

    const { error: profileError } = await sb.from("profiles").insert({
      id: created.user.id,
      username: normalized,
      display_name: displayName.trim() || normalized,
      avatar_initials: initialsFrom(displayName || normalized),
    });
    if (profileError) {
      // Don't leave an auth user with no profile behind -- exactly the
      // orphaned-row failure mode 0002_guest_seed.sql's own guard exists to
      // avoid, just on the write path instead of the migration path.
      await sb.auth.admin.deleteUser(created.user.id);
      return { error: profileError.message };
    }

    // Admin-created users don't get an automatic confirmation email the way
    // supabase.auth.signUp() would -- resend() is what actually triggers
    // Supabase's own confirmation-email send for an existing unconfirmed
    // user. Best-effort: a delivery failure here (rate-limited default
    // Supabase mail, no SMTP configured) shouldn't undo an otherwise-valid
    // account creation, just like requestPasswordReset()'s own send failures
    // are logged rather than surfaced as this call's result.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { error: resendError } = await sb.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: `${appUrl}/login?confirmed=1` },
    });
    if (resendError) {
      console.error(`[createAccount] confirmation email send failed for ${normalized}:`, resendError.message);
    }

    // Issue #115: this account was created via the service-role admin
    // client, which never establishes a real Supabase Auth session/cookie
    // for the new user -- only this app's own pepiros_session cookie gets
    // set afterward (app/api/auth/signup/route.ts). A fresh signup session
    // passed getSession()/middleware fine but had no Supabase session, so
    // sb.auth.updateUser({ password }) (change-password) failed with "Auth
    // session missing!" until the user explicitly logged out and back in --
    // which is exactly what signInWithPassword does here, immediately,
    // through the same cookie-bound client verifyCredentials() (login) uses.
    // Best-effort: a failure here (e.g. email confirmation required before
    // sign-in, per this project's own Supabase setting) doesn't undo an
    // otherwise-valid account, same reasoning as the confirmation email
    // above -- change-password would then fail once, with the existing
    // honest error telling them to sign in first, rather than never at all.
    const serverClient = await createSupabaseServerClient();
    const { error: signInError } = await serverClient.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      console.error(`[createAccount] post-signup session sign-in failed for ${normalized}:`, signInError.message);
    }

    const profile = await this.getProfile(created.user.id);
    if (!profile) return { error: "Account was created but the profile could not be read back." };
    return { profile };
  },

  async verifyCredentials(username, password) {
    // Supabase Auth owns credentials; usernames map to an email alias. That
    // alias is NOT always the synthetic `${username}@users.pepiros.dev`
    // pattern any more (issue #45: a real email given at signup becomes the
    // account's actual Auth email), so this looks up whatever is really
    // stored for this user's auth.users row via the admin API rather than
    // reconstructing the synthetic pattern and getting it wrong for every
    // account created with a real email.
    const sb = await createSupabaseServerClient();
    const { data: profileRow } = await sb
      .from("profiles")
      .select("id, username")
      .eq("username", username.trim().toLowerCase())
      .maybeSingle();
    if (!profileRow) return null;

    const admin = createSupabaseServiceClient();
    const { data: authUser } = await admin.auth.admin.getUserById(profileRow.id);
    const email = authUser.user?.email ?? `${profileRow.username}@users.pepiros.dev`;

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return null;

    return this.getProfile(profileRow.id);
  },

  async requestPasswordReset(username) {
    const normalized = username.trim().toLowerCase();
    const sb = createSupabaseServiceClient();

    // Always returns the same {ok: true} regardless of whether the account
    // exists or has a real email -- a per-case error message ("no such
    // account" vs. "no recovery email on file") would let a caller enumerate
    // real usernames the same way verifyCredentials's own generic failure
    // message avoids, one level up from what #45 fixed. #45's honesty fix
    // was about never CLAIMING a link was sent when it wasn't (the prior,
    // reverted attempt's actual bug) -- that's a different problem from
    // "the response shape differs per input," and the fix for this one is
    // the standard one: collapse the response, keep the real distinction
    // server-side only (logged, not returned).
    const { data: profileRow } = await sb
      .from("profiles")
      .select("id, username")
      .eq("username", normalized)
      .maybeSingle();

    if (profileRow) {
      const { data: authUser } = await sb.auth.admin.getUserById(profileRow.id);
      const email = authUser.user?.email ?? null;
      const isRealEmail = Boolean(email) && email !== `${profileRow.username}@users.pepiros.dev`;

      if (isRealEmail) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const { error } = await sb.auth.resetPasswordForEmail(email!, {
          redirectTo: `${appUrl}/auth/reset-callback`,
        });
        if (error) console.error(`[requestPasswordReset] resetPasswordForEmail failed for ${normalized}:`, error.message);
      } else {
        console.error(`[requestPasswordReset] ${normalized} has no real recovery email on file -- nothing sent.`);
      }
    } else {
      console.error(`[requestPasswordReset] no account for username ${normalized} -- nothing sent.`);
    }

    return { ok: true };
  },

  async createSession(profileId) {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.from("sessions").insert({ profile_id: profileId }).select("id").single();
    if (error || !data) {
      // Expected right after this ships and before supabase/migrations/
      // 0003_sessions.sql has actually been applied -- degrade to "no
      // session tracking" rather than failing the login this is part of.
      console.error("[createSession] could not create a session row (has 0003_sessions.sql been applied?):", error?.message);
      return null;
    }
    return data.id as string;
  },

  async isSessionRevoked(sessionId) {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.from("sessions").select("revoked_at").eq("id", sessionId).maybeSingle();
    if (error) {
      // Fail open: if the check itself can't run (table missing, network
      // blip), that's "no revocation enforcement," which is exactly
      // today's pre-#85 behavior -- not a reason to lock a real session out.
      console.error(`[isSessionRevoked] could not check session ${sessionId}:`, error.message);
      return false;
    }
    if (!data) return false; // No row (pre-migration cookie, or already-cascaded profile deletion) -- nothing to revoke.
    return data.revoked_at !== null;
  },

  async revokeSession(sessionId) {
    const sb = createSupabaseServiceClient();
    const { error } = await sb.from("sessions").update({ revoked_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) console.error(`[revokeSession] could not revoke session ${sessionId}:`, error.message);
  },

  async revokeAllSessions(profileId) {
    const sb = createSupabaseServiceClient();
    const { error } = await sb
      .from("sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("profile_id", profileId)
      .is("revoked_at", null);
    if (error) console.error(`[revokeAllSessions] could not revoke sessions for ${profileId}:`, error.message);
  },

  async getPostByPaperId(paperId) {
    const sb = createSupabaseServiceClient();
    const { data } = await sb
      .from("posts")
      .select("*")
      .eq("paper_id", paperId)
      .eq("status", "published")
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      authorId: data.author_id,
      paperId: data.paper_id,
      title: data.title,
      authors: data.authors ?? [],
      year: data.year ?? 0,
      venue: data.venue ?? "",
      field: data.field ?? "Machine learning",
      openAccess: data.open_access,
      sourceUrl: data.source_url ?? "",
      status: data.status,
      publishedAt: (data.published_at ?? data.created_at).slice(0, 10),
      groundingCoverage: Number(data.grounding_coverage ?? 0),
      dropRate: Number(data.drop_rate ?? 0),
    };
  },

  async listCommentsForPost(postId) {
    const sb = createSupabaseServiceClient();
    const { data } = await sb
      .from("comments")
      .select("*, profiles!inner(username, display_name, avatar_initials)")
      .eq("post_id", postId)
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

  async addComment({ postId, authorId, body, claimRef }) {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb
      .from("comments")
      .insert({ post_id: postId, author_id: authorId, body, claim_ref: claimRef })
      .select("*, profiles!inner(username, display_name, avatar_initials)")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not post comment.");

    return {
      id: data.id,
      postId: data.post_id,
      authorName: data.profiles?.display_name ?? "Unknown",
      authorUsername: data.profiles?.username ?? "unknown",
      authorInitials: data.profiles?.avatar_initials ?? "?",
      body: data.body,
      createdAt: data.created_at.slice(0, 10),
      claimRef: data.claim_ref,
      read: data.read,
    };
  },

  async getLikeState(postId, viewerId) {
    const sb = createSupabaseServiceClient();
    const { count } = await sb.from("likes").select("*", { count: "exact", head: true }).eq("post_id", postId);

    let liked = false;
    if (viewerId) {
      const { data } = await sb
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("profile_id", viewerId)
        .maybeSingle();
      liked = Boolean(data);
    }
    return { count: count ?? 0, liked };
  },

  async setLiked(postId, profileId, liked) {
    const sb = createSupabaseServiceClient();
    if (liked) {
      await sb.from("likes").upsert({ post_id: postId, profile_id: profileId });
    } else {
      await sb.from("likes").delete().eq("post_id", postId).eq("profile_id", profileId);
    }
  },

  async getFollowState(profileId, viewerId) {
    const sb = createSupabaseServiceClient();
    const { count } = await sb.from("follows").select("*", { count: "exact", head: true }).eq("followee_id", profileId);

    let following = false;
    if (viewerId) {
      const { data } = await sb
        .from("follows")
        .select("followee_id")
        .eq("follower_id", viewerId)
        .eq("followee_id", profileId)
        .maybeSingle();
      following = Boolean(data);
    }
    return { followerCount: count ?? 0, following };
  },

  async setFollowing(followerId, followeeId, following) {
    // Matches the follows table's own check constraint (no self-follow) --
    // a no-op here rather than surfacing that as a thrown DB error.
    if (followerId === followeeId) return;

    const sb = createSupabaseServiceClient();
    if (following) {
      await sb.from("follows").upsert({ follower_id: followerId, followee_id: followeeId });
    } else {
      await sb.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
    }
  },

  async getProfile(id) {
    // service client: see the header note on auth.uid() being null here
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
    return data ? asProfile(data) : null;
  },

  async updateProfile(profileId, { displayName, bio }) {
    const sb = createSupabaseServiceClient();
    const trimmedName = displayName.trim();
    const { data, error } = await sb
      .from("profiles")
      .update({ display_name: trimmedName, bio: bio.trim(), avatar_initials: initialsFrom(trimmedName) })
      .eq("id", profileId)
      .select("*")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not update the profile.");
    return asProfile(data);
  },

  async deleteAccount(profileId) {
    const admin = createSupabaseServiceClient();
    // No manual cleanup of profiles/posts/comments/likes/follows/
    // onboarding_responses needed: every one of those references
    // profiles.id, which references auth.users(id) on delete cascade
    // (0001_platform.sql), and profiles.id IS the auth user id. Deleting
    // the auth user is the one operation that removes all of it.
    const { error } = await admin.auth.admin.deleteUser(profileId);
    if (error) return { error: error.message };
    return { ok: true };
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

  async getNotificationPrefs(profileId) {
    const sb = createSupabaseServiceClient();
    const { data, error } = await sb.from("profiles").select("notification_prefs").eq("id", profileId).maybeSingle();
    if (error || !data?.notification_prefs) {
      // Expected right after this ships and before supabase/migrations/
      // 0004_notification_prefs.sql has actually been applied -- degrade to
      // the same defaults the toggle used to hardcode, rather than
      // breaking the settings page over a column that isn't there yet.
      if (error) {
        console.error(
          `[getNotificationPrefs] could not read prefs for ${profileId} (has 0004_notification_prefs.sql been applied?):`,
          error.message,
        );
      }
      return DEFAULT_NOTIFICATION_PREFS;
    }
    return data.notification_prefs as NotificationPrefs;
  },

  async saveNotificationPrefs(profileId, prefs) {
    const sb = createSupabaseServiceClient();
    const { error } = await sb.from("profiles").update({ notification_prefs: prefs }).eq("id", profileId);
    if (error) {
      console.error(
        `[saveNotificationPrefs] could not save prefs for ${profileId} (has 0004_notification_prefs.sql been applied?):`,
        error.message,
      );
    }
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
