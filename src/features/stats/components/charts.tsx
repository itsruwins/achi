import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import type {
  DailyCount,
  ForecastDay,
  MaturityCounts,
  StrugglingCard,
} from "@/features/stats/queries";
import { buildCalendar } from "@/features/stats/streaks";

/*
  All charts here are plain HTML and CSS with no client JavaScript. At this size
  — 90 cells, 4 segments, 8 bars — a charting library would ship more bytes than
  the data it draws, and none of these need to re-render.

  Hover detail uses native `title`, which also gives keyboard and screen-reader
  users the same text via aria-label. Every chart is followed by, or built from,
  readable numbers, so colour is never the only channel.
*/

// -----------------------------------------------------------------------------
// Stat tile — a number is a form, not a one-bar chart.
// -----------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <p className="text-xs uppercase tracking-wide text-subtle">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-3xl font-semibold tracking-tight tabular-nums",
          accent ? "text-accent" : "text-text",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Activity heatmap — sequential magnitude, one hue, low → high.
// -----------------------------------------------------------------------------

/**
 * Cut points for the four intensity steps.
 *
 * Fixed thresholds rather than quantiles of the user's own data: a relative
 * scale makes a 3-review day look "dark" during a quiet month and "light"
 * during a busy one, so the chart stops being comparable with itself.
 */
function intensityClass(count: number): string {
  if (count === 0) return "bg-viz-empty";
  if (count < 10) return "bg-viz-1";
  if (count < 25) return "bg-viz-2";
  if (count < 50) return "bg-viz-3";
  return "bg-viz-4";
}

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function ActivityHeatmap({
  counts,
  today,
  days = 91,
}: {
  counts: DailyCount[];
  today: string;
  days?: number;
}) {
  const byDay = new Map(counts.map((row) => [row.day, row.reviewed]));
  const cells = buildCalendar(byDay, today, days);
  const total = cells.reduce((sum, cell) => sum + cell.count, 0);

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-text">Activity</h2>
        <p className="text-xs text-muted">
          {total} {total === 1 ? "review" : "reviews"} in {days} days
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <div className="flex gap-1.5">
          {/* Weekday gutter, so the grid reads as a calendar rather than a wall. */}
          <div className="grid grid-rows-7 gap-[3px] pr-1 text-[10px] leading-[13px] text-subtle">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>

          <div className="grid grid-flow-col grid-rows-7 gap-[3px]">
            {cells.map((cell) => {
              const label = `${cell.count} ${
                cell.count === 1 ? "review" : "reviews"
              } on ${cell.date}`;
              return (
                <div
                  key={cell.date}
                  title={label}
                  aria-label={label}
                  className={cn(
                    "size-[13px] rounded-[3px]",
                    intensityClass(cell.count),
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Scale legend: an ordinal colour ramp is meaningless without one. */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-subtle">
        <span>Less</span>
        {["bg-viz-empty", "bg-viz-1", "bg-viz-2", "bg-viz-3", "bg-viz-4"].map(
          (tone) => (
            <span key={tone} className={cn("size-[11px] rounded-[3px]", tone)} />
          ),
        )}
        <span>More</span>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Card maturity — part-to-whole across ordered buckets.
// -----------------------------------------------------------------------------

const MATURITY_ORDER = [
  { key: "new", label: "New", tone: "bg-viz-1", note: "Not yet studied" },
  { key: "learning", label: "Learning", tone: "bg-viz-2", note: "Under a week" },
  { key: "young", label: "Young", tone: "bg-viz-3", note: "1–3 weeks" },
  { key: "mature", label: "Mature", tone: "bg-viz-4", note: "3 weeks+" },
] as const;

export function MaturityBar({ counts }: { counts: MaturityCounts }) {
  const total = MATURITY_ORDER.reduce((sum, b) => sum + counts[b.key], 0);

  if (total === 0) {
    return (
      <section className="rounded-card border border-border bg-surface p-5 shadow-card">
        <h2 className="text-sm font-medium text-text">Card maturity</h2>
        <p className="mt-2 text-sm text-muted">
          Add a deck to review and its cards will start maturing here.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-text">Card maturity</h2>
        <p className="text-xs text-muted">{total} in review</p>
      </div>

      {/* 2px surface gaps between segments — the surface doing the separating,
          so touching fills never blur into one another. */}
      <div className="mt-4 flex h-5 gap-[2px] overflow-hidden rounded-[4px]">
        {MATURITY_ORDER.map((bucket) => {
          const count = counts[bucket.key];
          if (count === 0) return null;
          const share = (count / total) * 100;
          const label = `${bucket.label}: ${count} cards (${Math.round(share)}%)`;

          return (
            <div
              key={bucket.key}
              title={label}
              aria-label={label}
              className={bucket.tone}
              style={{ width: `${share}%` }}
            />
          );
        })}
      </div>

      {/* Direct labels: identity never rests on colour alone. */}
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {MATURITY_ORDER.map((bucket) => (
          <li key={bucket.key} className="flex items-start gap-2">
            <span
              className={cn("mt-1 size-2.5 shrink-0 rounded-[2px]", bucket.tone)}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-sm tabular-nums text-text">
                {counts[bucket.key]}
              </span>
              <span className="block text-xs text-muted">{bucket.label}</span>
              <span className="block text-[10px] text-subtle">{bucket.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Seven-day forecast — single series, so every bar takes the same colour.
// -----------------------------------------------------------------------------

export function ForecastChart({ days }: { days: ForecastDay[] }) {
  const peak = Math.max(1, ...days.map((day) => day.cards));

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-text">Coming up</h2>
        <p className="text-xs text-muted">Next 7 days</p>
      </div>

      <div className="mt-5 flex h-32 items-end justify-between gap-2">
        {days.map((day, index) => {
          const height = (day.cards / peak) * 100;
          const weekday = new Date(`${day.dueOn}T00:00:00Z`).toLocaleDateString(
            "en-US",
            { weekday: "short", timeZone: "UTC" },
          );
          const label = `${day.cards} ${
            day.cards === 1 ? "card" : "cards"
          } due ${index === 0 ? "today" : `on ${day.dueOn}`}`;

          return (
            <div
              key={day.dueOn}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[11px] tabular-nums text-muted">
                {day.cards > 0 ? day.cards : ""}
              </span>

              <div className="flex h-full w-full items-end justify-center">
                <div
                  title={label}
                  aria-label={label}
                  // Capped width so a wide screen doesn't turn bars into slabs;
                  // rounded at the data end, square on the baseline.
                  className={cn(
                    "w-full max-w-6 rounded-t-[4px]",
                    day.cards > 0 ? "bg-viz-mark" : "bg-viz-empty",
                  )}
                  style={{ height: day.cards > 0 ? `${Math.max(height, 4)}%` : "3px" }}
                />
              </div>

              <span className="text-[11px] text-subtle">
                {index === 0 ? "Today" : weekday}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Struggling cards
// -----------------------------------------------------------------------------

export function StrugglingCards({ cards }: { cards: StrugglingCard[] }) {
  if (cards.length === 0) return null;

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-medium text-text">Giving you trouble</h2>
      <p className="mt-0.5 text-xs text-muted">
        Cards you&rsquo;ve forgotten more than once. Worth rewriting — a card
        that keeps failing is usually asking two questions at once.
      </p>

      <ul className="mt-4 divide-y divide-border">
        {cards.map((card) => (
          <li key={card.cardId} className="flex items-baseline gap-3 py-2.5">
            <Link
              href={`/decks/${card.deckId}`}
              className="min-w-0 flex-1 truncate text-sm text-text hover:text-primary"
            >
              {card.front || "(no front text)"}
            </Link>
            <span className="shrink-0 text-xs tabular-nums text-muted">
              {card.lapses} lapses
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
