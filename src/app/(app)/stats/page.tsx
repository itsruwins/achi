import type { Metadata } from "next";

import { requireOnboardedUser } from "@/features/auth/queries";
import { todayString } from "@/features/srs/algorithm";
import {
  ActivityHeatmap,
  ForecastChart,
  MaturityBar,
  StatTile,
  StrugglingCards,
} from "@/features/stats/components/charts";
import {
  getDailyCounts,
  getForecast,
  getMaturityCounts,
  getStrugglingCards,
} from "@/features/stats/queries";
import { summarizeStreak } from "@/features/stats/streaks";

export const metadata: Metadata = { title: "Stats" };

const ACTIVITY_DAYS = 91;
/** Long enough that a streak of any realistic length is fully visible. */
const STREAK_WINDOW_DAYS = 400;

export default async function StatsPage() {
  const { user } = await requireOnboardedUser();
  const today = todayString();

  const [activity, streakHistory, forecast, maturity, struggling] =
    await Promise.all([
      getDailyCounts(ACTIVITY_DAYS),
      getDailyCounts(STREAK_WINDOW_DAYS),
      getForecast(6),
      getMaturityCounts(),
      getStrugglingCards(user.id),
    ]);

  const streak = summarizeStreak(
    streakHistory.filter((day) => day.reviewed > 0).map((day) => day.day),
    today,
  );

  const reviewed = streakHistory.reduce((sum, day) => sum + day.reviewed, 0);
  const correct = streakHistory.reduce((sum, day) => sum + day.correct, 0);
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : null;

  if (reviewed === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Stats</h1>
        <div className="rounded-card border border-dashed border-border-strong bg-surface p-12 text-center">
          <p className="text-sm font-medium text-text">No reviews yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Add a deck to review and rate a few cards. Everything here is built
            from your review history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">Stats</h1>
        <p className="mt-1 text-sm text-muted">
          Counted from cards you rated in review — flashcard flips aren&rsquo;t
          scored, so nothing here is inflated by flipping through a deck.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Current streak"
          value={`${streak.current}`}
          hint={streak.current === 1 ? "day" : "days"}
          accent={streak.current > 0}
        />
        <StatTile
          label="Best streak"
          value={`${streak.longest}`}
          hint={streak.longest === 1 ? "day" : "days"}
        />
        <StatTile
          label="Reviewed"
          value={reviewed.toLocaleString()}
          hint="cards rated"
        />
        <StatTile
          label="Accuracy"
          value={accuracy === null ? "—" : `${accuracy}%`}
          hint="knew it on sight"
        />
      </div>

      <ActivityHeatmap counts={activity} today={today} days={ACTIVITY_DAYS} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MaturityBar counts={maturity} />
        <ForecastChart days={forecast} />
      </div>

      <StrugglingCards cards={struggling} />
    </div>
  );
}
