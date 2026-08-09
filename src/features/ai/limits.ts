/**
 * Daily AI allowances.
 *
 * There is no paid tier, so one limit applies to everyone and these two numbers
 * are the whole cost-control story. Change them here — they are passed into the
 * database function per call, so no migration is involved.
 *
 * Token shape per unit on openai/gpt-oss-120b:
 *
 *   generation  ~6.5k in + ~2k out
 *   tutor reply ~3k in  + ~0.4k out
 *
 * These are set far higher than they were on a frontier model, because Groq's
 * open-weight pricing is roughly two orders of magnitude cheaper per token —
 * check the current rate at groq.com/pricing before treating any figure here as
 * a budget. On Groq's free tier the binding constraint is usually its own
 * per-minute and per-day rate limits rather than spend, and those apply to the
 * whole key: heavy use by one account can produce a 429 for everyone else.
 */
export const DAILY_GENERATION_LIMIT = 20;
export const DAILY_TUTOR_LIMIT = 100;

/** Card counts offered in the generator. */
export const CARD_COUNT_OPTIONS = [10, 15, 20, 30] as const;
export const DEFAULT_CARD_COUNT = 15;

/**
 * Groq's per-minute token budget for this model on the free tier.
 *
 * Measured from the `x-ratelimit-limit-tokens` response header, not guessed.
 * The number that matters: **`max_completion_tokens` counts against this**, so a
 * request reserving 16k output tokens is rejected outright even when the prompt
 * is tiny. Everything below is sized to keep prompt + reserved output under it.
 *
 * It is a limit on the *key*, shared by every user of this deployment, so two
 * people generating in the same minute can collide. Both routes detect that and
 * refund the caller's daily allowance rather than charging for a failure.
 */
export const GROQ_TPM_BUDGET = 8_000;

/**
 * Tokens to reserve for the answer, sized to the number of cards requested.
 *
 * `max_completion_tokens` caps reasoning AND visible output together. Running
 * out mid-answer does not return a truncated deck — Groq rejects the whole
 * request with `json_validate_failed` and an empty `failed_generation`, because
 * what the model produced never became valid JSON. So this has to be generous:
 * an undersized budget is a hard failure, an oversized one only costs headroom.
 *
 * Measured on the real model: 15 cards from ~2.5k characters runs about 950
 * completion tokens at `low` effort. 150/card plus 800 leaves roughly double
 * that, which covers a source dense enough to produce long answers.
 *
 * Worst case against the 8k budget: 30 cards reserves 4,500, the system prompt
 * and schema run to roughly 800, and MAX_SOURCE_CHARS caps input near 2,500 —
 * about 7,800.
 */
export function outputTokenBudget(cardCount: number): number {
  return Math.min(4_500, Math.max(1_500, cardCount * 150 + 800));
}

/**
 * Cap on submitted text.
 *
 * ~10k characters is roughly 2.5k tokens, which leaves room for the largest
 * card count inside the per-minute budget. It is also about a dense chapter —
 * beyond that the model does worse anyway, because the material stops being
 * focused.
 */
export const MAX_SOURCE_CHARS = 10_000;
export const MAX_TUTOR_MESSAGE_CHARS = 500;

/** How many cards of deck context the tutor is given. */
export const TUTOR_CONTEXT_CARDS = 40;

/** Turns of chat history kept in a tutor conversation. */
export const TUTOR_HISTORY_TURNS = 12;
