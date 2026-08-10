import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CheckIcon, FlameIcon, ReviewIcon, StatsIcon } from "@/components/ui/icons";
import { EmptyState, PageHeader } from "@/components/ui/layout";
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
      <div>
        <PageHeader title="Stats" />
        <EmptyState
          icon={<StatsIcon className="size-5" />}
          title="Nothing measured yet"
          body="Everything here is built from cards you rate in review — streaks, accuracy, what's coming up. Rate a handful and the page fills in."
          action={
            <Link href="/review">
              <Button>Go to review</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stats"
        description="Counted from cards you rated in review — flashcard flips aren't scored, so nothing here is inflated by flipping through a deck."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Current streak"
          value={`${streak.current}`}
          hint={streak.current === 1 ? "day" : "days"}
          accent={streak.current > 0}
          icon={<FlameIcon className="size-3.5" />}
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
          icon={<ReviewIcon className="size-3.5" />}
        />
        <StatTile
          label="Accuracy"
          value={accuracy === null ? "—" : `${accuracy}%`}
          hint="knew it on sight"
          icon={<CheckIcon className="size-3.5" />}
        />
      </div>

      <div className="mt-3">
        <ActivityHeatmap counts={activity} today={today} days={ACTIVITY_DAYS} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <MaturityBar counts={maturity} />
        <ForecastChart days={forecast} />
      </div>

      <div className="mt-3">
        <StrugglingCards cards={struggling} />
      </div>
    </div>
  );
}
