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

export interface DataAdapter {
  readonly kind: "seed" | "supabase";

  verifyCredentials(username: string, password: string): Promise<Profile | null>;
  createAccount(input: { username: string; password: string; displayName: string }): Promise<CreateAccountResult>;
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
    throw new Error(
      "PEPIROS_PLATFORM_BACKEND=supabase but NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are not set.",
    );
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
