import { createClient } from "@/lib/supabase/server";

import { DAILY_GENERATION_LIMIT, DAILY_TUTOR_LIMIT } from "./limits";

export type QuotaKind = "generation" | "tutor";

export type QuotaResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0 };

/**
 * Spend one unit of the caller's daily allowance.
 *
 * The check and the increment happen together inside `consume_ai_quota` — see
 * 0005_ai.sql. Doing it here as read-then-write would let two concurrent
 * requests both observe "4 used" and both proceed.
 *
 * Call this BEFORE the model request. Charging on success instead would let
 * anyone burn unlimited tokens by cancelling requests mid-flight.
 */
export async function consumeQuota(kind: QuotaKind): Promise<QuotaResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("consume_ai_quota", {
    quota_kind: kind,
    daily_limit:
      kind === "generation" ? DAILY_GENERATION_LIMIT : DAILY_TUTOR_LIMIT,
  });

  if (error) {
    console.error("[ai] consume_ai_quota failed:", error.message);
    // Fail closed. A quota system that opens up whenever the database hiccups
    // is not a quota system.
    return { allowed: false, remaining: 0 };
  }

  const remaining = Number(data);
  if (remaining < 0) return { allowed: false, remaining: 0 };

  return { allowed: true, remaining };
}

/**
 * Hand back an allowance for a request that never reached the model.
 *
 * Only for pre-generation failures — a rejected request, a dropped connection.
 * A model that ran and returned something disappointing is not refunded: those
 * tokens were genuinely spent, and refunding them would make "regenerate until
 * it looks right" free.
 */
export async function refundQuota(kind: QuotaKind): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("refund_ai_quota", { quota_kind: kind });

  // Non-fatal: the user is already getting an error for the real failure, and
  // one uncredited generation is not worth turning that into a second one.
  if (error) console.error("[ai] refund_ai_quota failed:", error.message);
}

/**
 * Did the model fail to produce JSON matching the schema?
 *
 * Groq returns 400 `json_validate_failed` when constrained decoding could not
 * complete — almost always because `max_completion_tokens` ran out partway
 * through. `failed_generation` comes back empty, so there is nothing to recover.
 */
export function isJsonValidationFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { error?: { error?: { code?: string } } }).error?.error?.code;
  return code === "json_validate_failed";
}

/**
 * Did this request fail because Groq's per-minute token budget was exhausted?
 *
 * Groq signals it as 429, or as 413 with `rate_limit_exceeded` when the
 * *reserved* output alone exceeds the budget — checking the status code on its
 * own misses the second case.
 */
export function isRateLimited(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const status = (error as { status?: number }).status;
  if (status === 429) return true;

  const code = (error as { error?: { error?: { code?: string } } }).error?.error?.code;
  return code === "rate_limit_exceeded";
}

export async function getQuotaRemaining(): Promise<{
  generations: number;
  tutor: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("ai_quota_remaining", {
      generation_limit: DAILY_GENERATION_LIMIT,
      tutor_limit: DAILY_TUTOR_LIMIT,
    })
    .maybeSingle();

  if (error || !data) {
    return { generations: DAILY_GENERATION_LIMIT, tutor: DAILY_TUTOR_LIMIT };
  }

  const row = data as { generations_left: number; tutor_left: number };
  return {
    generations: Number(row.generations_left),
    tutor: Number(row.tutor_left),
  };
}
