import { describe, expect, it } from "vitest";
import { seedMetrics, seedReach } from "./seed";
import type { Post } from "./types";

function fakePost(id: string): Post {
  return {
    id,
    authorId: "u-test",
    paperId: `paper-${id}`,
    title: `Post ${id}`,
    authors: ["Test Author"],
    year: 2024,
    venue: "Test Venue",
    field: "Machine learning",
    openAccess: true,
    sourceUrl: "https://example.com",
    status: "published",
    publishedAt: "2024-01-01",
    groundingCoverage: 0.9,
    dropRate: 0.1,
  };
}

describe("seedMetrics", () => {
  it("gives each series point its own comments count that sums to the aggregate total", () => {
    const m = seedMetrics("p-a", 14);
    const summed = m.series.reduce((sum, point) => sum + point.comments, 0);
    expect(summed).toBe(m.comments);
    expect(m.series.every((point) => point.comments >= 0)).toBe(true);
  });
});

describe("seedReach", () => {
  // Issue #275: totalComments used to be metrics.reduce((a, m) => a + m.comments, 0)
  // -- m.comments is seedMetrics' aggregate over the *whole* days*2 period
  // (both the current and comparison window), not scoped to just the
  // current window the way totalViews/totalLikes already correctly are via
  // sum(days, days*2, ...). That made Comments come out roughly 2x inflated
  // relative to what Views/Likes represent for the same selected range.
  it("scopes totalComments to the current window, not the full comparison+current period", () => {
    const posts = [fakePost("a"), fakePost("b")];
    const days = 7;
    const result = seedReach(posts, "7d");

    // Independently recomputed straight from seedMetrics' per-day series,
    // not by calling seedReach's own (fixed) sum() helper.
    const metrics = posts.map((p) => seedMetrics(p.id, days * 2));
    const expectedCurrentWindowComments = metrics.reduce((total, m) => {
      let windowSum = 0;
      for (let i = days; i < days * 2; i++) windowSum += m.series[i]?.comments ?? 0;
      return total + windowSum;
    }, 0);
    const wholePeriodComments = metrics.reduce((total, m) => total + m.comments, 0);

    expect(result.totalComments).toBe(expectedCurrentWindowComments);
    // The whole-period total genuinely covers twice the days -- confirms
    // this assertion would have caught the old bug, which returned
    // wholePeriodComments here instead.
    expect(result.totalComments).toBeLessThan(wholePeriodComments);
  });

  it("computes commentsDelta from a real previous-window comparison, not a synthetic constant", () => {
    const posts = [fakePost("a"), fakePost("b")];
    const result = seedReach(posts, "30d");
    // Previously delta(totalComments, totalComments * 0.88) -- always
    // exactly the same ~13.6% figure regardless of the actual data. Real
    // seeded data varies enough across posts/ranges that landing on that
    // exact figure by chance is not a real risk.
    expect(result.commentsDelta).not.toBeCloseTo((1 / 0.88 - 1), 5);
  });
});
