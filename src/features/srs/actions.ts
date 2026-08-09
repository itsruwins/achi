"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";
import { getDeck } from "@/features/decks/queries";

import {
  computeNextState,
  initialSrsState,
  todayString,
  type Rating,
  type SrsState,
} from "./algorithm";

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user.id;
}

function isRating(value: string): value is Rating {
  return (
    value === "again" || value === "hard" || value === "good" || value === "easy"
  );
}

/**
 * Enroll a deck into review, or drop it.
 *
 * Enrolling seeds a schedule row for every card so they all become due
 * immediately — a deck you just enrolled should have something to review, not
 * an empty queue until some other process fills it in.
 */
export async function toggleEnrollment(formData: FormData) {
  const userId = await requireUserId();
  const deckId = String(formData.get("deckId") ?? "");

  const deck = await getDeck(deckId);
  if (!deck) redirect("/decks");

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("deck_enrollments")
    .select("deck_id")
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .maybeSingle();

  if (existing) {
    // Unenrolling leaves card_srs alone. Someone who re-enrolls next month gets
    // their old schedule back rather than starting over — and if they wanted a
    // reset, "unenroll" is not an obvious way to ask for one.
    await supabase
      .from("deck_enrollments")
      .delete()
      .eq("user_id", userId)
      .eq("deck_id", deckId);
  } else {
    await supabase
      .from("deck_enrollments")
      .insert({ user_id: userId, deck_id: deckId });

    await seedScheduleForDeck(userId, deckId);
  }

  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/review");
}

async function seedScheduleForDeck(userId: string, deckId: string) {
  const supabase = await createClient();

  const { data: cards } = await supabase
    .from("cards")
    .select("id")
    .eq("deck_id", deckId);

  if (!cards?.length) return;

  const today = todayString();
  const seed = initialSrsState(today);

  // onConflict ignores cards that already have a schedule, so re-enrolling
  // never resets progress on cards the user has already been reviewing.
  await supabase.from("card_srs").upsert(
    cards.map((card) => ({
      user_id: userId,
      card_id: card.id,
      deck_id: deckId,
      interval_days: seed.interval,
      ease_factor: seed.easeFactor,
      repetitions: seed.repetitions,
      lapses: seed.lapses,
      due_date: seed.dueDate,
    })),
    { onConflict: "user_id,card_id", ignoreDuplicates: true },
  );
}

/**
 * Add newly created cards to the schedule of an already-enrolled deck.
 *
 * Called when the review page loads rather than on card creation, so a card
 * added before enrollment is picked up too.
 */
export async function syncEnrolledSchedules() {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("deck_enrollments")
    .select("deck_id")
    .eq("user_id", userId);

  for (const enrollment of enrollments ?? []) {
    await seedScheduleForDeck(userId, enrollment.deck_id as string);
  }
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Record a rating and schedule the card's next appearance.
 *
 * The current state is read from the database rather than taken from the
 * client. A schedule the client can dictate is a schedule that drifts the
 * moment two tabs are open — and there is nothing to notice it going wrong.
 */
export async function reviewCard(
  cardId: string,
  rating: string,
): Promise<ReviewResult> {
  const userId = await requireUserId();

  if (!isRating(rating)) return { ok: false, error: "Unknown rating." };

  const supabase = await createClient();

  const { data: row, error: readError } = await supabase
    .from("card_srs")
    .select("deck_id, interval_days, ease_factor, repetitions, lapses, due_date")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (readError) return { ok: false, error: readError.message };
  if (!row) return { ok: false, error: "That card is not enrolled for review." };

  const current: SrsState = {
    interval: row.interval_days as number,
    // numeric() comes back as a string from PostgREST; Number() here rather
    // than trusting the shape.
    easeFactor: Number(row.ease_factor),
    repetitions: row.repetitions as number,
    lapses: row.lapses as number,
    dueDate: row.due_date as string,
  };

  const next = computeNextState(current, rating, todayString());

  const { error: writeError } = await supabase
    .from("card_srs")
    .update({
      interval_days: next.interval,
      ease_factor: next.easeFactor,
      repetitions: next.repetitions,
      lapses: next.lapses,
      due_date: next.dueDate,
      last_rating: rating,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("card_id", cardId);

  if (writeError) return { ok: false, error: writeError.message };

  // Logged after the schedule write succeeds, so history never claims a review
  // that did not actually take effect.
  await supabase.from("review_logs").insert({
    user_id: userId,
    card_id: cardId,
    deck_id: row.deck_id,
    rating,
    interval_after: next.interval,
  });

  return { ok: true };
}
