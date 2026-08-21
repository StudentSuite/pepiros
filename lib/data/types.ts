/**
 * Platform domain types.
 *
 * Deliberately separate from types/anchor.ts, which models the GROUNDING
 * domain (papers, chunks, nodes, evidence, anchors). This file models the
 * SOCIAL domain layered on top: who published what, who follows whom, and how
 * much reach a post got. The two share only a paper id.
 *
 * Keeping them apart is why lib/db/schema.ts (20 Drizzle tables, all grounding)
 * is not extended with these; the platform tables live in their own migration.
 */

export type Role =
  | "grad_student"
  | "researcher"
  | "clinician"
  | "educator"
  | "engineer"
  | "curious_reader";

export type ReferralSource =
  | "reddit"
  | "x"
  | "github"
  | "friend"
  | "search"
  | "other";

export type ExperienceLevel =
  | "first_papers"
  | "few_a_month"
  | "weekly"
  | "its_my_job";

export type ReadingIntent =
  | "keep_up"
  | "verify_before_citing"
  | "lit_review"
  | "teach"
  | "connect_agent";

export type AgentTool = "claude" | "codex" | "cursor" | "none";

export const RESEARCH_FIELDS = [
  "Machine learning",
  "Natural language processing",
  "Computer vision",
  "Neuroscience",
  "Genomics",
  "Clinical medicine",
  "Epidemiology",
  "Climate science",
  "Ecology",
  "Physics",
  "Chemistry",
  "Statistics",
] as const;

export type ResearchField = (typeof RESEARCH_FIELDS)[number];

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatarInitials: string;
  followerCount: number;
  followingCount: number;
  joinedAt: string;
  onboarded: boolean;
  /**
   * Issue #234: read access to every account's onboarding answers. Set by
   * hand in the SQL editor; there is deliberately no role-management UI,
   * because a screen that grants admin is a far larger security surface than
   * one boolean nothing in the app can write.
   */
  isAdmin: boolean;
}

/** One row of the admin onboarding view: the answers, plus who gave them. */
export interface OnboardingResponseWithProfile extends OnboardingResponse {
  username: string;
  displayName: string;
  email: string | null;
  joinedAt: string;
}

/** components/settings/NotificationPrefs.tsx's toggle state (issue #70). */
export interface NotificationPrefs {
  follow: boolean;
  comment: boolean;
  like: boolean;
  digest: boolean;
}

export interface OnboardingResponse {
  profileId: string;
  country: string | null;
  referralSource: ReferralSource | null;
  referralOther: string | null;
  role: Role | null;
  fields: ResearchField[];
  intent: ReadingIntent | null;
  experience: ExperienceLevel | null;
  agentTools: AgentTool[];
  /**
   * Issue #233. Everything above is segmentation and drives what the home
   * surface shows first. These capture what the user actually experienced,
   * which is the only part that tells us whether the premise is real. All
   * optional, all asked after the segmentation questions, so drop-off lands
   * here rather than on the answers personalisation depends on.
   */
  wrongSummaryStory: string | null;
  verifyMethod: VerifyMethod[];
  verifyMethodOther: string | null;
  /** Opt-in, and false unless actively turned on. Never defaulted to true. */
  contactOptIn: boolean;
  /** The six-bucket `fields` enum is not how researchers describe themselves. */
  fieldFreetext: string | null;
  weeklyTrigger: string | null;
  completedAt: string | null;
  /**
   * Issue #252: the highest step number (1-10) this profile has ever
   * reached, saved on every step-advance/back regardless of whether that
   * step's own field was actually filled in (every field is independently
   * skippable, so a non-null field cannot be used as a proxy for "reached
   * this step" -- a user can skip every question and still walk to step
   * 10). 0 for a profile that has never opened the wizard.
   */
  furthestStep: number;
}

export const VERIFY_METHODS = [
  "open_pdf_and_search",
  "trust_and_move_on",
  "ask_a_colleague",
  "check_cited_source",
  "reread_section",
  "other",
] as const;

export type VerifyMethod = (typeof VERIFY_METHODS)[number];

export type PostStatus = "published" | "draft" | "archived";

export interface Post {
  id: string;
  authorId: string;
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  field: ResearchField;
  openAccess: boolean;
  sourceUrl: string;
  status: PostStatus;
  publishedAt: string;
  /**
   * Grounding stats, the honest ones: these come from the verifier.
   *
   * Issue #282: null means "not measured", and is the correct value for any
   * post that has not been through the pipeline. The comment above was true
   * of a real ingested post and false of every seeded one on the site, which
   * is how a fabricated percentage ended up rendering as a measurement.
   * Callers must not coerce null to 0: a post with no measurement is not a
   * post that scored zero.
   */
  groundingCoverage: number | null;
  dropRate: number | null;
}

export interface PostMetrics {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  /** Daily view counts, oldest first. Length matches the requested range. */
  series: { date: string; views: number; likes: number; comments: number }[];
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorUsername: string;
  authorInitials: string;
  body: string;
  createdAt: string;
  /** Set when the comment is anchored to one specific claim, not the paper. */
  claimRef: string | null;
  read: boolean;
}

/** Everything the creator dashboard needs, in one shape. */
export interface ReachSummary {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  followers: number;
  /** Change vs the previous window of equal length, as a fraction. */
  viewsDelta: number;
  likesDelta: number;
  commentsDelta: number;
  followersDelta: number;
  series: { date: string; views: number; likes: number }[];
  perPost: { postId: string; title: string; views: number; likes: number; comments: number }[];
}

export type RangeKey = "7d" | "30d" | "90d" | "all";

export const RANGE_DAYS: Record<RangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 365,
};
