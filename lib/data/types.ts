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
  completedAt: string | null;
}

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
  /** Grounding stats, the honest ones: these come from the verifier. */
  groundingCoverage: number;
  dropRate: number;
}

export interface PostMetrics {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  /** Daily view counts, oldest first. Length matches the requested range. */
  series: { date: string; views: number; likes: number }[];
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
