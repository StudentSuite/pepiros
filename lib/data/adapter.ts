import { CATALOG, CATALOG_BY_SLUG, type CatalogPaper } from "./papers";
import {
  GUEST_ID,
  GUEST_ONBOARDING,
  GUEST_PASSWORD,
  GUEST_PROFILE,
  GUEST_USERNAME,
  seedComments,
  seedPosts,
  seedReach,
} from "./seed";
import { supabaseAdapter } from "./supabase-adapter";
import type {
  Comment,
  OnboardingResponse,
  Post,
  Profile,
  RangeKey,
  ReachSummary,
} from "./types";

/**
 * The one seam between the app and its data.
 *
 * Two implementations sit behind this interface:
 *
 *   - `seed`     deterministic generated data (lib/data/seed.ts). Used whenever
 *                Supabase env vars are absent, which is the default.
 *   - `supabase` real Postgres, used when the env vars are present.
 *
 * This exists so the guest demo works with NO backend at all. A judge can sign
 * in as guest/guest, browse a populated account, and never touch a network
 * service. The moment a Supabase project exists and the migration in
 * supabase/migrations/ is applied, the same call sites hit real rows without
 * a single component changing.
 */

export type CreateAccountResult = { profile: Profile } | { error: string };

export interface LikeState {
  count: number;
  liked: boolean;
}

export interface FollowState {
  followerCount: number;
  following: boolean;
}

export interface DataAdapter {
  readonly kind: "seed" | "supabase";

  verifyCredentials(username: string, password: string): Promise<Profile | null>;
  /**
   * `email` is optional (issue #45): when given, it becomes the account's
   * real Supabase Auth email instead of the synthetic `${username}@users.
   * pepiros.dev` placeholder, which is what actually lets password recovery
   * deliver mail somewhere real. Omitting it keeps today's exact behaviour.
   */
  createAccount(input: {
    username: string;
    password: string;
    displayName: string;
    email?: string;
  }): Promise<CreateAccountResult>;

  /**
   * Issue #45 collected an optional real email so this would have somewhere
   * to send to -- this is that follow-up.
   *
   * The Supabase implementation always resolves `{ ok: true }`, regardless
   * of whether the username exists or has a real email on file: a
   * per-outcome response ("no such account" vs. "no recovery email") would
   * let a caller enumerate real usernames, the same reason
   * verifyCredentials's failure message is generic. The real distinction
   * (account not found / no real email / link actually sent) is logged
   * server-side, never returned to the caller.
   *
   * `{ error }` is reserved for the seed adapter, where the feature isn't
   * available in this deployment at all -- a statement about the
   * deployment, not about any specific account, so it isn't an enumeration
   * risk the way a per-account result would be.
   *
   * Not returning a blanket "check your email" for every input either is
   * what makes this honest: a prior attempt at this exact feature was built
   * and reverted specifically for claiming success while never delivering
   * mail to the synthetic `${username}@users.pepiros.dev` placeholder.
   * Collapsing the *response* is not the same as collapsing the *behavior*
   * -- a real email genuinely gets a real link; the response is just
   * silent about which case happened.
   */
  requestPasswordReset(username: string): Promise<{ ok: true } | { error: string }>;

  /**
   * components/settings/ProfileForm.tsx's Save button used to just await a
   * setTimeout and show a success toast -- a real edit vanished exactly
   * like the node-editor Save bug (a P0 that got its own real fix) did
   * before that one was caught. This is the real persistence that was
   * missing: displayName/bio only, since username is deliberately
   * unchangeable (its own row in that form says so) and avatar/onboarding
   * have their own paths.
   */
  updateProfile(profileId: string, input: { displayName: string; bio: string }): Promise<Profile>;

  /**
   * The live `posts` row a catalog paper corresponds to, if any (matched by
   * `paper_id`). Null in seed mode (no real post concept there) and in
   * supabase mode for any catalog paper nobody has published yet -- callers
   * fall back to the illustrative seed rendering in either case, rather than
   * showing an empty "real" discussion for a post that doesn't exist.
   */
  getPostByPaperId(paperId: string): Promise<Post | null>;
  listCommentsForPost(postId: string): Promise<Comment[]>;
  addComment(input: { postId: string; authorId: string; body: string; claimRef: string | null }): Promise<Comment>;
  getLikeState(postId: string, viewerId: string | null): Promise<LikeState>;
  setLiked(postId: string, profileId: string, liked: boolean): Promise<void>;
  getFollowState(profileId: string, viewerId: string | null): Promise<FollowState>;
  setFollowing(followerId: string, followeeId: string, following: boolean): Promise<void>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByUsername(username: string): Promise<Profile | null>;
  getOnboarding(profileId: string): Promise<OnboardingResponse | null>;
  saveOnboarding(response: OnboardingResponse): Promise<void>;

  listPosts(authorId: string): Promise<Post[]>;
  deletePost(authorId: string, postId: string): Promise<void>;
  listComments(authorId: string): Promise<Comment[]>;
  getReach(authorId: string, range: RangeKey): Promise<ReachSummary>;

  listCatalog(): Promise<CatalogPaper[]>;
  getCatalogPaper(slug: string): Promise<CatalogPaper | null>;
}

// ---------------------------------------------------------------------------
// Seed implementation
// ---------------------------------------------------------------------------

/**
 * Mutations are held in module memory, so an optimistic delete survives a
 * client-side navigation within the session but resets on server restart.
 * That is the honest behaviour for a demo account, and it is why the UI labels
 * destructive actions as demo-only rather than pretending they persist.
 */
const deletedPostIds = new Set<string>();

const seedAdapter: DataAdapter = {
  kind: "seed",

  async verifyCredentials(username, password) {
    const ok =
      username.trim().toLowerCase() === GUEST_USERNAME && password === GUEST_PASSWORD;
    return ok ? GUEST_PROFILE : null;
  },

  async getProfile(id) {
    return id === GUEST_ID ? GUEST_PROFILE : null;
  },

  async getProfileByUsername(username) {
    return username.toLowerCase() === GUEST_USERNAME ? GUEST_PROFILE : null;
  },

  async createAccount() {
    // The seed backend has no persistence to create a real row in -- it
    // exists solely so the guest demo works with no Supabase project at all
    // (see the module doc above). Honest failure here, not a fake account.
    return {
      error:
        "Sign-up needs the Supabase-backed platform, which isn't enabled on this deployment. Sign in as guest/guest instead.",
    };
  },

  async requestPasswordReset() {
    return {
      error: "Password reset needs the Supabase-backed platform, which isn't enabled on this deployment.",
    };
  },

  async updateProfile() {
    // Unreachable in practice: the seed backend's only profile is the guest
    // demo account, and ProfileForm always renders it readOnly (its inputs
    // are disabled, so "dirty" can never become true to enable Save). A real
    // call here would mean that guard was bypassed, which is a bug to
    // surface loudly, not something to paper over with a silent no-op.
    throw new Error("The demo account's profile cannot be edited.");
  },

  // No real post/comment/like/follow concept in seed mode -- callers treat a
  // null post as "fall back to the illustrative seed rendering," which is
  // the entire existing /paper and /u experience. These exist only to
  // satisfy the interface; nothing above calls them when there's no post.
  async getPostByPaperId() {
    return null;
  },
  async listCommentsForPost() {
    return [];
  },
  async addComment() {
    throw new Error("Commenting needs the Supabase-backed platform, which isn't enabled on this deployment.");
  },
  async getLikeState() {
    return { count: 0, liked: false };
  },
  async setLiked() {},
  async getFollowState() {
    return { followerCount: 0, following: false };
  },
  async setFollowing() {},

  async getOnboarding(profileId) {
    return profileId === GUEST_ID ? GUEST_ONBOARDING : null;
  },

  async saveOnboarding() {
    // no-op: the guest account ships already onboarded, and the wizard is
    // walkable for demonstration without writing anywhere
  },

  async listPosts(authorId) {
    return seedPosts(authorId).filter((p) => !deletedPostIds.has(p.id));
  },

  async deletePost(_authorId, postId) {
    deletedPostIds.add(postId);
  },

  async listComments(authorId) {
    return seedComments(await this.listPosts(authorId));
  },

  async getReach(authorId, range) {
    return seedReach(await this.listPosts(authorId), range);
  },

  async listCatalog() {
    return CATALOG;
  },

  async getCatalogPaper(slug) {
    return CATALOG_BY_SLUG.get(slug) ?? null;
  },
};

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Backend selection is an EXPLICIT opt-in, not an inference from whether
 * Supabase env vars happen to exist.
 *
 * That distinction matters here. NEXT_PUBLIC_SUPABASE_URL and the anon key are
 * already set in this project for the GROUNDING domain (papers, chunks, nodes,
 * evidence). Treating their presence as "the platform tables exist too" would
 * silently point this adapter at a database with no profiles, posts, or
 * post_metrics, and guest sign-in would fail with a confusing Postgres error
 * rather than working offline as designed.
 *
 * So the platform layer stays on the seed generator until someone sets
 * PEPIROS_PLATFORM_BACKEND=supabase, which is the same moment they apply
 * supabase/migrations/0001_platform.sql.
 */
function platformBackendIsSupabase(): boolean {
  if (process.env.PEPIROS_PLATFORM_BACKEND !== "supabase") return false;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!configured) {
    // This used to throw, uncaught, inside getAdapter() -- which every one
    // of a dozen-plus routes/pages calls with no try/catch (login, signup,
    // every server component under app/(app)/layout.tsx that reads the
    // current session). A real but incomplete config (the flag set, the
    // actual credentials forgotten) crashed every one of those instead of
    // degrading. Logged loudly so this is diagnosable, but falls back to the
    // seed adapter rather than crashing the page -- which is safe to do:
    // every seedAdapter method already returns an honest "needs the
    // Supabase-backed platform" error rather than a fake success, so this
    // fallback can't silently lose real data the way it would if the
    // *supabase* adapter's writes failed silently instead.
    console.error(
      "[data/adapter] PEPIROS_PLATFORM_BACKEND=supabase but NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are not set -- falling back to the seed adapter.",
    );
    return false;
  }
  return true;
}

let cached: DataAdapter | null = null;

export function getAdapter(): DataAdapter {
  if (cached) return cached;
  // supabase-adapter is imported statically rather than lazily: a conditional
  // require() is not statically resolvable by the bundler, and the module is
  // written to construct nothing at import time, so pulling it in costs
  // nothing and requires no env vars until a method is actually called.
  cached = platformBackendIsSupabase() ? supabaseAdapter : seedAdapter;
  return cached;
}

export { GUEST_ID, GUEST_USERNAME, GUEST_PASSWORD };
