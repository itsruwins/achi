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

/** Shared chart frame, so every panel on the page starts from the same box. */
function Panel({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface p-4", className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-md font-semibold tracking-tight text-text">{title}</h2>
        {aside ? <p className="text-sm text-subtle">{aside}</p> : null}
      </div>
      {children}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Stat tile — a number is a form, not a one-bar chart.
// -----------------------------------------------------------------------------

export function StatTile({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5">
        {icon ? (
          <span className={accent ? "text-accent" : "text-subtle"}>{icon}</span>
        ) : null}
        <span className="label-data">{label}</span>
      </p>
      <p
        className={cn(
          "tnum font-display mt-1.5 text-3xl",
          accent ? "text-accent" : "text-text",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
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
    <Panel
      title="Activity"
      aside={`${total} ${total === 1 ? "review" : "reviews"} in ${days} days`}
    >
      {/* Scrolls inside its own container: 13 weeks of cells is wider than a
          phone, and the page body must never scroll sideways. */}
      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex gap-1.5">
          {/* Weekday gutter, so the grid reads as a calendar rather than a wall. */}
          <div className="grid shrink-0 grid-rows-7 gap-[3px] pr-1 text-[10px] leading-[13px] text-subtle">
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
                    "size-[13px] rounded-[3px] transition-[outline-color] duration-[var(--dur-fast)]",
                    "outline outline-1 outline-transparent hover:outline-text",
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
    </Panel>
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
      <Panel title="Card maturity">
        <p className="mt-2 text-base text-muted">
          Turn review on for a deck and its cards start here as New, then move
          right as the intervals get longer.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Card maturity" aside={`${total} in review`}>
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
              <span className="tnum block text-base font-medium text-text">
                {counts[bucket.key]}
              </span>
              <span className="block text-sm text-muted">{bucket.label}</span>
              <span className="block text-2xs text-subtle">{bucket.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// Seven-day forecast — single series, so every bar takes the same colour.
// -----------------------------------------------------------------------------

export function ForecastChart({ days }: { days: ForecastDay[] }) {
  const peak = Math.max(1, ...days.map((day) => day.cards));

  return (
    <Panel title="Coming up" aside="Next 7 days">
      {/*
        The plot area gets an explicit height rather than `h-full` on a nested
        column — percentage heights need a resolved parent height, and an
        auto-sized flex column doesn't give one, which silently collapses every
        bar to nothing.
      */}
      <div className="mt-5 flex justify-between gap-2">
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
              className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              {/*
                A zero day renders a non-breaking space rather than an empty
                string: an empty span collapses to no height, which shortens
                that one column and lifts its weekday label out of line with
                the rest of the axis.
              */}
              <span className="tnum text-sm text-muted">
                {day.cards > 0 ? day.cards : " "}
              </span>

              <div className="flex h-24 w-full items-end justify-center">
                <div
                  title={label}
                  aria-label={label}
                  // Capped width so a wide screen doesn't turn bars into slabs;
                  // rounded at the data end, square on the baseline.
                  className={cn(
                    "w-full max-w-6 rounded-t-[4px] transition-opacity duration-[var(--dur-fast)] group-hover:opacity-80",
                    day.cards > 0 ? "bg-viz-mark" : "bg-viz-empty",
                  )}
                  style={{
                    height: day.cards > 0 ? `${Math.max(height, 4)}%` : "3px",
                  }}
                />
              </div>

              <span
                className={cn(
                  "text-sm",
                  index === 0 ? "font-medium text-text" : "text-subtle",
                )}
              >
                {index === 0 ? "Today" : weekday}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// -----------------------------------------------------------------------------
// Struggling cards
// -----------------------------------------------------------------------------

export function StrugglingCards({ cards }: { cards: StrugglingCard[] }) {
  if (cards.length === 0) return null;

  return (
    <Panel title="Giving you trouble">
      <p className="mt-0.5 max-w-[68ch] text-sm text-muted">
        Cards you&rsquo;ve forgotten more than once. Worth rewriting — a card
        that keeps failing is usually asking two questions at once.
      </p>

      <ul className="mt-3 divide-y divide-border">
        {cards.map((card) => (
          <li key={card.cardId} className="flex items-baseline gap-3 py-2">
            <Link
              href={`/decks/${card.deckId}`}
              className="min-w-0 flex-1 truncate text-base text-text transition-colors duration-[var(--dur-fast)] hover:text-primary"
            >
              {card.front || "(no front text)"}
            </Link>
            <span className="tnum shrink-0 text-sm text-danger">
              {card.lapses} {card.lapses === 1 ? "lapse" : "lapses"}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
