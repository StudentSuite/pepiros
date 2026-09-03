import clsx from "clsx";

/**
 * GitHub-style activity calendar: 53 week columns by 7 day rows, covering the
 * trailing year.
 *
 * Takes counts keyed by ISO date (YYYY-MM-DD) rather than fetching anything
 * itself, so the same grid renders catalog additions on /open and published
 * papers on a profile without either page teaching it about their data.
 *
 * Intensity is scaled against the busiest day in the window, not against a
 * fixed threshold. A fixed scale would render every cell at level 1 for a
 * catalog whose busiest day is 3, and saturate everything at level 4 for one
 * whose busiest day is 300.
 *
 * No client JS: the per-day tooltip is a native `title`, which keeps this a
 * server component and gets keyboard and screen-reader behaviour for free.
 */

const DAY_MS = 86_400_000;
const WEEKS = 53;

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Local-time ISO date. `toISOString()` would shift the day in any tz behind UTC. */
function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 0 for an empty day, then 1..4 scaled against the busiest day in range. */
function level(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_CLASS: Record<number, string> = {
  0: "bg-surface-sunken border border-border/60",
  1: "bg-[var(--activity-1)]",
  2: "bg-[var(--activity-2)]",
  3: "bg-[var(--activity-3)]",
  4: "bg-[var(--activity-4)]",
};

export interface ContributionCalendarProps {
  /** ISO date (YYYY-MM-DD) to count. Days absent from the map render empty. */
  counts: Map<string, number>;
  /** Plural noun for the summary line and tooltips, e.g. "papers". */
  noun?: string;
  /** Defaults to today. Injectable so the grid is testable. */
  endDate?: Date;
}

export function ContributionCalendar({
  counts,
  noun = "contributions",
  endDate,
}: ContributionCalendarProps) {
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(0, 0, 0, 0);

  // Wind back to the Sunday on or before the start so every column is a full
  // calendar week and the day rows line up, exactly as GitHub does it.
  const start = new Date(end.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  start.setDate(start.getDate() - start.getDay());

  const weeks: { date: Date; iso: string; count: number }[][] = [];
  let total = 0;
  let max = 0;

  for (let w = 0; w < WEEKS; w++) {
    const week: { date: Date; iso: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      const iso = isoDate(date);
      const count = date > end ? 0 : (counts.get(iso) ?? 0);
      if (date <= end) {
        total += count;
        if (count > max) max = count;
      }
      week.push({ date, iso, count });
    }
    weeks.push(week);
  }

  // A month label sits above the first column whose month differs from the
  // column before it, so labels land where each month actually begins.
  const monthLabels = weeks.map((week, i) => {
    const first = week[0];
    const prev = weeks[i - 1]?.[0];
    if (i === 0 || !first || !prev) return null;
    const m = first.date.getMonth();
    return m !== prev.date.getMonth() ? MONTHS[m] : null;
  });

  return (
    <section aria-label={`${noun} activity`}>
      <h2 className="font-sans text-base text-ink">
        {total} {total === 1 ? noun.replace(/s$/, "") : noun} in the last year
      </h2>

      {/* Issue #354: font-size set once here, every dimension below is `em`
          against it (11px/3px/18px at this component's original 10px basis
          -> 1.1em/0.3em/1.8em) instead of each being independently pixel
          locked. A text-size change now moves the whole grid together --
          before, the grid stayed exactly 11px while the labels beside it
          grew, so the two drifted out of alignment. */}
      <div className="mt-s-4 overflow-x-auto pb-s-2 font-mono text-2xs">
        <div className="inline-flex gap-s-2">
          {/* Day-of-week rail. Only Mon/Wed/Fri are labelled, same as GitHub:
              seven labels at this cell size collide. */}
          <div
            className="mt-[1.8em] grid shrink-0 gap-[0.3em] text-ink-faint"
            aria-hidden
          >
            {["", "Mon", "", "Wed", "", "Fri", ""].map((label, i) => (
              <div key={i} className="h-[1.1em] leading-[1.1em]">
                {label}
              </div>
            ))}
          </div>

          <div>
            <div className="flex gap-[0.3em]" aria-hidden>
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="w-[1.1em] leading-[1.8em] text-ink-faint"
                >
                  {label ? <span className="whitespace-nowrap">{label}</span> : null}
                </div>
              ))}
            </div>

            <div className="flex gap-[0.3em]">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid gap-[0.3em]">
                  {week.map(({ date, iso, count }) => {
                    if (date > end) {
                      return <div key={iso} className="h-[1.1em] w-[1.1em]" />;
                    }
                    const label = `${count} ${count === 1 ? noun.replace(/s$/, "") : noun} on ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
                    return (
                      <div
                        key={iso}
                        title={label}
                        className={clsx(
                          "h-[1.1em] w-[1.1em] rounded-[0.2em]",
                          LEVEL_CLASS[level(count, max)]
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-s-2 flex items-center justify-end gap-s-2 font-mono text-2xs text-ink-faint">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span
            key={l}
            className={clsx("h-[1.1em] w-[1.1em] rounded-[0.2em]", LEVEL_CLASS[l])}
          />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
