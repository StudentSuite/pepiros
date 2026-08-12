/**
 * Mock catalog for `/discover` and `/paper/[slug]` -- this build has no real
 * backend (see Global Constraints in the frontend v1 plan). Every field here
 * is a typed plain literal, no fetch, no async, no Supabase import.
 *
 * Titles are original, not the old landing page's EXAMPLE_PAPERS
 * ("Morning Bright Light & Sleep Onset" etc, app/(marketing)/page.tsx before
 * Task 3's replace) -- varied across the same kind of fields plan.md's own
 * example papers evoke: sleep/circadian, climate, ML.
 */
export type MockPaper = {
  slug: string;
  title: string;
  authors: string[];
  venue?: string;
  publishedDate: string;
  openAccess: boolean;
  pillarIndex: number;
  discussionCount: number;
  likeCount: number;
};

export const mockPapers: MockPaper[] = [
  {
    slug: "chronotype-shift-adolescent-sleep-latency",
    title: "Chronotype Shift and Sleep-Onset Latency in Adolescents: A Three-Year Longitudinal Study",
    authors: ["Mira Chen", "Dev Patel"],
    venue: "Sleep Medicine Reviews",
    publishedDate: "2024-03-12",
    openAccess: true,
    pillarIndex: 1,
    discussionCount: 14,
    likeCount: 82,
  },
  {
    slug: "melatonin-jet-lag-randomized-trial",
    title: "Melatonin Supplementation for Jet Lag Recovery: A Randomized Placebo-Controlled Trial",
    authors: ["Omar Haddad", "Lucia Ferretti"],
    venue: "The Lancet Sleep Health",
    publishedDate: "2023-10-11",
    openAccess: true,
    pillarIndex: 1,
    discussionCount: 12,
    likeCount: 48,
  },
  {
    slug: "shift-work-gut-microbiome-cohort",
    title: "Gut Microbiome Composition Shifts in Rotating-Shift Nurses: A Six-Month Cohort",
    authors: ["Hana Kobayashi", "Daniel Osei"],
    venue: "eLife",
    publishedDate: "2023-05-08",
    openAccess: true,
    pillarIndex: 1,
    discussionCount: 17,
    likeCount: 64,
  },
  {
    slug: "sparse-attention-long-context-inference-cost",
    title: "Sparse Attention Patterns and Long-Context Inference Cost in Transformer Models",
    authors: ["Wei Zhang", "Samuel O'Connor"],
    venue: "arXiv preprint",
    publishedDate: "2025-01-15",
    openAccess: true,
    pillarIndex: 2,
    discussionCount: 41,
    likeCount: 210,
  },
  {
    slug: "reward-hacking-failure-modes-survey",
    title: "A Survey of Reward-Hacking Failure Modes in Reinforcement Learning Agents",
    authors: ["Elena Popescu"],
    venue: "arXiv preprint",
    publishedDate: "2024-09-30",
    openAccess: true,
    pillarIndex: 2,
    discussionCount: 9,
    likeCount: 55,
  },
  {
    slug: "wearable-actigraphy-insomnia-detection-cnn",
    title: "Wearable Actigraphy and Convolutional Models for Insomnia-Pattern Detection",
    authors: ["Noor Al-Sayed", "Keiko Tanaka"],
    venue: "IEEE Journal of Biomedical and Health Informatics",
    publishedDate: "2024-04-02",
    openAccess: true,
    pillarIndex: 2,
    discussionCount: 19,
    likeCount: 71,
  },
  {
    slug: "few-shot-calibration-clinical-note-summarization",
    title: "Few-Shot Prompt Calibration for Clinical Note Summarization",
    authors: ["Jonas Weber", "Priya Subramaniam"],
    venue: "npj Digital Medicine",
    publishedDate: "2024-12-04",
    openAccess: true,
    pillarIndex: 4,
    discussionCount: 28,
    likeCount: 97,
  },
  {
    slug: "arctic-permafrost-methane-flux-2050-projections",
    title: "Arctic Permafrost Thaw and Methane Flux: 2050 Projections Under RCP Scenarios",
    authors: ["Lars Eriksson", "Fatima Noor", "Tomas Vidal"],
    venue: "Nature Climate Change",
    publishedDate: "2024-06-19",
    openAccess: true,
    pillarIndex: 5,
    discussionCount: 23,
    likeCount: 140,
  },
  {
    slug: "coral-bleaching-thermal-stress-indo-pacific",
    title: "Coral Bleaching Thresholds Under Marine Heatwave Stress in the Indo-Pacific",
    authors: ["Priya Subramaniam"],
    publishedDate: "2023-08-27",
    openAccess: false,
    pillarIndex: 5,
    discussionCount: 3,
    likeCount: 12,
  },
  {
    slug: "urban-heat-island-tree-canopy-mumbai",
    title: "Urban Heat Island Mitigation Through Targeted Tree-Canopy Expansion: A Mumbai Case Study",
    authors: ["Rhea Kapoor"],
    publishedDate: "2025-02-20",
    openAccess: false,
    pillarIndex: 6,
    discussionCount: 1,
    likeCount: 5,
  },
];

/** Single lookup, undefined on miss -- callers 404 via next/navigation's notFound(). */
export function getMockPaperBySlug(slug: string): MockPaper | undefined {
  return mockPapers.find((paper) => paper.slug === slug);
}

// Discover-specific topic label per pillarIndex -- distinct from
// components/ui/PillarChip.tsx's pillarColor()/pillarTextColor(), which are
// the generic color-only mapping used system-wide (canvas nodes, edges).
// This mapping is mock content local to the discover/paper-detail surfaces:
// it turns a paper's pillarIndex into a human topic tag for its PillarChip.
const TOPIC_LABELS: Record<number, string> = {
  1: "Sleep & Circadian",
  2: "Machine Learning",
  3: "Chronobiology",
  4: "Clinical & Health",
  5: "Climate & Environment",
  6: "Urban Systems",
  7: "Methods & Data",
};

export function topicLabelForPillar(pillarIndex: number): string {
  return TOPIC_LABELS[pillarIndex] ?? "General";
}

/** Month + year only (e.g. "Mar 2024") -- enough for a metadata line, no
 * day-of-month/timezone precision needed for mock publish dates. */
export function formatMockDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
