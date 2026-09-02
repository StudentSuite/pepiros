"use client";

import { useMemo, useState } from "react";
import type { OnboardingResponseWithProfile } from "@/lib/data/types";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";

/**
 * Aggregates on top, full responses below (issue #234).
 *
 * The aggregates are the point: a table of 500 rows answers nothing on its
 * own, and the questions worth acting on are "which role dominates" and "what
 * share opted in", not "what did row 214 say". The free-text answers are the
 * exception and are shown in full rather than truncated, since a summary of
 * somebody's own words is exactly the thing this product argues against.
 *
 * CSV is built client-side from data already on the page rather than through
 * a second admin-gated endpoint. One authorisation check, in the page, is
 * easier to keep correct than two in different places.
 */

/** Matches OnboardingWizard.tsx's own STEP_COUNT. */
const ONBOARDING_STEP_COUNT = 10;

function countBy<T extends string | null>(
  rows: OnboardingResponseWithProfile[],
  pick: (row: OnboardingResponseWithProfile) => T | T[],
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = pick(row);
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v === null || v === undefined || v === "") continue;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<[string, number]>;
  total: number;
}) {
  return (
    <Panel padded>
      <p className="kicker">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 font-sans text-sm text-ink-faint">No answers.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {rows.map(([label, count]) => (
            <li key={label} className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-sm text-ink-muted">{label.replace(/_/g, " ")}</span>
              <span className="shrink-0 font-mono text-xs text-ink">
                {count}
                <span className="text-ink-faint">
                  {" "}
                  ({Math.round((count / total) * 100)}%)
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** RFC 4180 quoting: free text will contain commas, quotes and newlines. */
function csvCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function OnboardingTable({
  responses,
}: {
  responses: OnboardingResponseWithProfile[];
}) {
  const [copied, setCopied] = useState(false);
  const total = responses.length;

  const aggregates = useMemo(
    () => ({
      role: countBy(responses, (r) => r.role),
      intent: countBy(responses, (r) => r.intent),
      experience: countBy(responses, (r) => r.experience),
      referral: countBy(responses, (r) => r.referralSource),
      agentTools: countBy(responses, (r) => r.agentTools),
      verifyMethod: countBy(responses, (r) => r.verifyMethod),
    }),
    [responses],
  );

  // Issue #252: "per-step completion so drop-off is visible". Every field
  // above is independently skippable, so this reads furthestStep (issue
  // #252's own migration column) rather than treating a non-null field as a
  // stand-in for "reached this step". Ordered by step number, not by count
  // like the Breakdowns above -- a funnel reads by sequence, not frequency.
  const stepFunnel = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of responses) counts.set(r.furthestStep, (counts.get(r.furthestStep) ?? 0) + 1);
    // 1-10: a saved row implies at least one next()/back() call, so a real
    // row's furthestStep is always >= 1 -- step 0 (never opened the wizard
    // at all) would always read zero here and isn't worth a row.
    return Array.from({ length: ONBOARDING_STEP_COUNT }, (_, i) => {
      const step = i + 1;
      return [`Step ${step}`, counts.get(step) ?? 0] as [string, number];
    });
  }, [responses]);

  type SortKey = "newest" | "furthestStep" | "role";
  const [sort, setSort] = useState<SortKey>("newest");
  const sortedResponses = useMemo(() => {
    const copy = [...responses];
    switch (sort) {
      case "furthestStep":
        return copy.sort((a, b) => b.furthestStep - a.furthestStep);
      case "role":
        return copy.sort((a, b) => (a.role ?? "").localeCompare(b.role ?? ""));
      case "newest":
      default:
        return copy.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    }
  }, [responses, sort]);

  const optInCount = responses.filter((r) => r.contactOptIn).length;
  const completedCount = responses.filter((r) => r.completedAt !== null).length;
  const storyCount = responses.filter((r) => (r.wrongSummaryStory ?? "").trim() !== "").length;

  async function copyCsv() {
    const header = [
      "username",
      "display_name",
      "email",
      "joined_at",
      "country",
      "role",
      "fields",
      "field_freetext",
      "intent",
      "experience",
      "agent_tools",
      "referral_source",
      "referral_other",
      "wrong_summary_story",
      "verify_method",
      "verify_method_other",
      "weekly_trigger",
      "contact_opt_in",
      "furthest_step",
      "completed_at",
    ];
    const lines = [
      header.join(","),
      ...sortedResponses.map((r) =>
        [
          r.username,
          r.displayName,
          r.email,
          r.joinedAt,
          r.country,
          r.role,
          r.fields.join("; "),
          r.fieldFreetext,
          r.intent,
          r.experience,
          r.agentTools.join("; "),
          r.referralSource,
          r.referralOther,
          r.wrongSummaryStory,
          r.verifyMethod.join("; "),
          r.verifyMethodOther,
          r.weeklyTrigger,
          r.contactOptIn,
          r.furthestStep,
          r.completedAt,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-s-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel padded>
          <p className="kicker">Responses</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{total}</p>
        </Panel>
        <Panel padded>
          <p className="kicker">Completed</p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">
            {completedCount}
            <span className="ml-1 font-sans text-sm text-ink-faint">
              {Math.round((completedCount / total) * 100)}%
            </span>
          </p>
        </Panel>
        <Panel padded>
          <p className="kicker">
            Told us a story
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">{storyCount}</p>
        </Panel>
        <Panel padded>
          <p className="kicker">
            Contact opt-in
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-ink">
            {optInCount}
            <span className="ml-1 font-sans text-sm text-ink-faint">
              {Math.round((optInCount / total) * 100)}%
            </span>
          </p>
        </Panel>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Breakdown title="Role" rows={aggregates.role} total={total} />
        <Breakdown title="Intent" rows={aggregates.intent} total={total} />
        <Breakdown title="Experience" rows={aggregates.experience} total={total} />
        <Breakdown title="Referral" rows={aggregates.referral} total={total} />
        <Breakdown title="Agent tools" rows={aggregates.agentTools} total={total} />
        <Breakdown title="How they verify today" rows={aggregates.verifyMethod} total={total} />
        <Breakdown title="Step reached (drop-off)" rows={stepFunnel} total={total} />
      </section>

      <section>
        <div className="mb-s-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-sans font-semibold text-xl text-ink">Responses</h2>
          <div className="flex items-center gap-2">
            <label className="font-sans text-xs text-ink-faint">
              Sort{" "}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded border border-border bg-surface-sunken px-1.5 py-1 font-sans text-xs text-ink-muted"
              >
                <option value="newest">Newest first</option>
                <option value="furthestStep">Furthest step</option>
                <option value="role">Role</option>
              </select>
            </label>
            <Button variant="secondary" size="sm" onClick={() => void copyCsv()}>
              {copied ? "Copied" : "Copy as CSV"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {sortedResponses.map((r) => (
            <Panel key={r.profileId} padded>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-sans text-sm text-ink">
                  {r.displayName}{" "}
                  <span className="text-ink-faint">@{r.username}</span>
                </p>
                <p className="font-mono text-[11px] text-ink-faint">
                  joined {r.joinedAt}
                  {r.completedAt
                    ? ` · completed ${r.completedAt}`
                    : ` · reached step ${r.furthestStep} of ${ONBOARDING_STEP_COUNT}`}
                  {r.contactOptIn ? " · opted in" : ""}
                </p>
              </div>

              <p className="mt-1.5 font-sans text-[13px] text-ink-faint">
                {[
                  r.role,
                  r.experience,
                  r.intent,
                  r.fieldFreetext || r.fields.join(", "),
                  r.country,
                ]
                  .filter(Boolean)
                  .map((v) => String(v).replace(/_/g, " "))
                  .join(" · ")}
              </p>

              {/* Free text in full, never truncated: a summary of somebody's
                  own words is the thing this product exists to argue against. */}
              {r.wrongSummaryStory && (
                <div className="mt-s-3">
                  <p className="kicker">
                    What went wrong
                  </p>
                  <p className="mt-1 font-serif text-[15px] leading-relaxed text-ink">
                    {r.wrongSummaryStory}
                  </p>
                </div>
              )}

              {r.weeklyTrigger && (
                <div className="mt-s-3">
                  <p className="kicker">
                    Would use it weekly if
                  </p>
                  <p className="mt-1 font-serif text-[15px] leading-relaxed text-ink">
                    {r.weeklyTrigger}
                  </p>
                </div>
              )}

              {(r.verifyMethod.length > 0 || r.verifyMethodOther) && (
                <p className="mt-s-3 font-sans text-[13px] text-ink-muted">
                  <span className="text-ink-faint">Verifies by:</span>{" "}
                  {[...r.verifyMethod.map((m) => m.replace(/_/g, " ")), r.verifyMethodOther]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </Panel>
          ))}
        </div>
      </section>
    </div>
  );
}
