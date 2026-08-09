/**
 * Streak arithmetic.
 *
 * Pure and clock-free — `today` is passed in — because a streak is the one
 * number in the dashboard people will actually be annoyed about if it's wrong,
 * and off-by-one date bugs are invisible until someone loses a 40-day run.
 */

/** Days between two `YYYY-MM-DD` dates. Positive when `b` is later. */
export function daysBetween(a: string, b: string): number {
  const from = Date.parse(`${a}T00:00:00Z`);
  const to = Date.parse(`${b}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

export type StreakSummary = {
  current: number;
  longest: number;
  /** Most recent day with any activity, or null. */
  lastActive: string | null;
};

/**
 * Current and longest run of consecutive active days.
 *
 * The current streak is allowed to end *yesterday* as well as today: a streak
 * shouldn't read as broken at 00:01 before you've had any chance to study. It
 * breaks once a full day has passed with nothing in it.
 *
 * `activeDays` may arrive unsorted and with duplicates; both are handled here
 * rather than assumed away, since it comes from a database aggregate that only
 * happens to be ordered today.
 */
export function summarizeStreak(
  activeDays: string[],
  today: string,
): StreakSummary {
  const unique = [...new Set(activeDays)].sort();

  if (unique.length === 0) {
    return { current: 0, longest: 0, lastActive: null };
  }

  let longest = 1;
  let run = 1;

  for (let i = 1; i < unique.length; i++) {
    run = daysBetween(unique[i - 1], unique[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const lastActive = unique[unique.length - 1];
  const gap = daysBetween(lastActive, today);

  // A gap of 2+ days means the streak is over. Note this counts the *run
  // ending at lastActive*, not the whole trailing run, so a streak that ended
  // last month reports as 0 rather than as its old length.
  let current = 0;
  if (gap <= 1) {
    current = 1;
    for (let i = unique.length - 1; i > 0; i--) {
      if (daysBetween(unique[i - 1], unique[i]) !== 1) break;
      current++;
    }
  }

  return { current, longest, lastActive };
}

/**
 * Fill in the days with no activity.
 *
 * The activity chart needs a cell for every day in the window, not only the
 * days that happen to have reviews — otherwise gaps collapse and a month of
 * scattered study looks identical to a solid week.
 */
export function buildCalendar(
  counts: Map<string, number>,
  today: string,
  days: number,
): { date: string; count: number }[] {
  const cells: { date: string; count: number }[] = [];
  const end = new Date(`${today}T00:00:00Z`);

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - offset);
    const date = day.toISOString().slice(0, 10);
    cells.push({ date, count: counts.get(date) ?? 0 });
  }

  return cells;
}
