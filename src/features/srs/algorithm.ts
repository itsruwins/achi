/**
 * Spaced repetition scheduling — an SM-2 variant.
 *
 * Every function here is pure and takes `today` explicitly rather than reading
 * the clock. Scheduling bugs are close to invisible: a card given the wrong
 * interval just shows up on the wrong day, weeks later, with nothing to point
 * at the cause. Pure functions are the only part of this system that can be
 * tested directly.
 *
 * Dates are `YYYY-MM-DD` in UTC. See `todayString` for why.
 */

export type Rating = "again" | "hard" | "good" | "easy";

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export type SrsState = {
  /** Days until the next review. */
  interval: number;
  /** Multiplier applied on each successful review. */
  easeFactor: number;
  /** Consecutive successful reviews; reset to 0 by "again". */
  repetitions: number;
  /** Lifetime count of "again" ratings — drives the struggling-cards list. */
  lapses: number;
  dueDate: string;
};

/**
 * Ease can fall this far and no further.
 *
 * Without a floor, a card you keep failing spirals toward a zero interval and
 * reappears every single session forever — the classic "ease hell" that makes
 * people abandon a deck.
 */
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;

/** Extra credit for "easy", on top of the normal interval growth. */
const EASY_BONUS = 1.3;

/**
 * Hard ceiling on how far out a card can be scheduled: ten years.
 *
 * Intervals compound — each success multiplies by the ease factor — so without
 * a cap they run away fast. A card rated "easy" thirty-odd times reaches a date
 * beyond what `Date` can represent, at which point `toISOString()` throws and
 * rating a card returns a 500 instead of scheduling it.
 *
 * Ten years is well past the point where the number stops meaning anything:
 * nobody is served by the difference between a 12-year and a 40-year interval.
 */
const MAX_INTERVAL_DAYS = 3650;

const EASE_DELTA: Record<Rating, number> = {
  again: -0.2,
  hard: -0.15,
  good: 0,
  easy: 0.15,
};

/** Intervals longer than this get randomized slightly. See `applyFuzz`. */
const FUZZ_THRESHOLD_DAYS = 2;
const FUZZ_RATIO = 0.05;

export function todayString(now: Date = new Date()): string {
  // UTC rather than local time: the alternative is a card's due date shifting
  // when someone travels, and reviews landing in two different "days" for a
  // user near midnight. A day boundary that is merely *wrong for everyone by a
  // few hours* is far less damaging than one that moves.
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Spread reviews either side of their exact due date.
 *
 * Without this, every card added in one sitting comes due in the same sitting
 * forever — you study 60 cards on Monday and get all 60 back a week later.
 * Short intervals are left alone; ±5% of one day rounds to nothing anyway.
 */
export function applyFuzz(interval: number, random: () => number): number {
  if (interval <= FUZZ_THRESHOLD_DAYS) return interval;

  const spread = Math.max(1, Math.round(interval * FUZZ_RATIO));
  const offset = Math.round(random() * 2 * spread) - spread;
  return clampInterval(interval + offset);
}

/** Keeps every scheduled interval inside a range `Date` can represent. */
export function clampInterval(interval: number): number {
  if (!Number.isFinite(interval)) return MAX_INTERVAL_DAYS;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(interval)));
}

export function initialSrsState(today: string): SrsState {
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: today,
  };
}

function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease));
}

/**
 * The interval a successful review earns, before fuzz and the easy bonus.
 *
 * First success is a day, second is six days, and after that the interval
 * multiplies by the card's ease — the standard SM-2 ladder.
 */
function nextSuccessfulInterval(state: SrsState): number {
  if (state.repetitions === 0) return 1;
  if (state.repetitions === 1) return 6;
  return clampInterval(state.interval * state.easeFactor);
}

export function computeNextState(
  state: SrsState,
  rating: Rating,
  today: string,
  random: () => number = Math.random,
): SrsState {
  const easeFactor = clampEase(state.easeFactor + EASE_DELTA[rating]);

  if (rating === "again") {
    // Back to the start of the ladder, and see it again tomorrow.
    return {
      interval: 1,
      easeFactor,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueDate: addDays(today, 1),
    };
  }

  if (rating === "hard") {
    // Hold the interval rather than growing it. Ease still drops, so repeated
    // "hard" ratings slow the card's future growth without resetting progress.
    const interval = clampInterval(state.interval);
    return {
      interval,
      easeFactor,
      repetitions: state.repetitions,
      lapses: state.lapses,
      dueDate: addDays(today, applyFuzz(interval, random)),
    };
  }

  const base = nextSuccessfulInterval(state);
  const interval = clampInterval(rating === "easy" ? base * EASY_BONUS : base);

  return {
    interval,
    easeFactor,
    repetitions: state.repetitions + 1,
    lapses: state.lapses,
    dueDate: addDays(today, applyFuzz(interval, random)),
  };
}

export function isDue(state: Pick<SrsState, "dueDate">, today: string): boolean {
  return state.dueDate <= today;
}

/**
 * How well-learned a card is, for the stats dashboard in Phase 5.
 *
 * The 21-day boundary for "mature" is the long-standing SM-2 convention: past
 * roughly three weeks, a card is being recalled rather than memorized.
 */
export type Maturity = "new" | "learning" | "young" | "mature";

export function maturity(state: Pick<SrsState, "repetitions" | "interval">): Maturity {
  if (state.repetitions === 0) return "new";
  if (state.interval < 7) return "learning";
  if (state.interval < 21) return "young";
  return "mature";
}
