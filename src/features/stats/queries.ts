import { createClient } from "@/lib/supabase/server";
import { todayString } from "@/features/srs/algorithm";

export type DailyCount = { day: string; reviewed: number; correct: number };
export type ForecastDay = { dueOn: string; cards: number };
export type MaturityBucket = "new" | "learning" | "young" | "mature";
export type MaturityCounts = Record<MaturityBucket, number>;

export type StrugglingCard = {
  cardId: string;
  deckId: string;
  front: string;
  lapses: number;
  intervalDays: number;
};

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Reviews per day over a window.
 *
 * Aggregated in Postgres via RPC. The alternative — fetching every review row
 * and grouping in JS — ships tens of thousands of rows to count them.
 */
export async function getDailyCounts(days: number): Promise<DailyCount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("review_daily_counts", {
    since_date: daysAgo(days),
  });

  if (error) {
    console.error("[stats] review_daily_counts failed:", error.message);
    return [];
  }

  return ((data ?? []) as { day: string; reviewed: number; correct: number }[]).map(
    (row) => ({
      day: row.day,
      reviewed: Number(row.reviewed),
      correct: Number(row.correct),
    }),
  );
}

export async function getForecast(daysAhead: number): Promise<ForecastDay[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("due_forecast", {
    days_ahead: daysAhead,
  });

  if (error) {
    console.error("[stats] due_forecast failed:", error.message);
    return [];
  }

  const byDay = new Map<string, number>();
  for (const row of (data ?? []) as { due_on: string; cards: number }[]) {
    byDay.set(row.due_on, Number(row.cards));
  }

  // Fill the gaps: a forecast missing its quiet days makes a busy Thursday look
  // adjacent to a busy Monday.
  const today = todayString();
  const out: ForecastDay[] = [];
  for (let offset = 0; offset <= daysAhead; offset++) {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    out.push({ dueOn: key, cards: byDay.get(key) ?? 0 });
  }

  return out;
}

export async function getMaturityCounts(): Promise<MaturityCounts> {
  const supabase = await createClient();
  const empty: MaturityCounts = { new: 0, learning: 0, young: 0, mature: 0 };

  const { data, error } = await supabase.rpc("card_maturity_counts");

  if (error) {
    console.error("[stats] card_maturity_counts failed:", error.message);
    return empty;
  }

  for (const row of (data ?? []) as { bucket: MaturityBucket; cards: number }[]) {
    empty[row.bucket] = Number(row.cards);
  }

  return empty;
}

/**
 * Cards rated "again" repeatedly.
 *
 * Two lapses is the threshold: one is a bad day, two is a pattern worth
 * showing someone.
 */
export async function getStrugglingCards(
  userId: string,
  limit = 8,
): Promise<StrugglingCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("card_srs")
    .select("card_id, deck_id, lapses, interval_days, cards!inner(front)")
    .eq("user_id", userId)
    .gte("lapses", 2)
    .order("lapses", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[stats] getStrugglingCards failed:", error.message);
    return [];
  }

  type Row = {
    card_id: string;
    deck_id: string;
    lapses: number;
    interval_days: number;
    cards: { front: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    cardId: row.card_id,
    deckId: row.deck_id,
    front: row.cards?.front ?? "",
    lapses: row.lapses,
    intervalDays: row.interval_days,
  }));
}
