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
