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
export const CARD_COUNT_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_CARD_COUNT = 20;

/**
 * Caps on what we'll send upstream.
 *
 * Input length is the main driver of generation cost, and an unbounded paste —
 * someone dropping a whole textbook in — is both expensive and worse at the
 * task than a focused excerpt.
 */
export const MAX_SOURCE_CHARS = 24_000;
export const MAX_TUTOR_MESSAGE_CHARS = 500;

/** How many cards of deck context the tutor is given. */
export const TUTOR_CONTEXT_CARDS = 40;

/** Turns of chat history kept in a tutor conversation. */
export const TUTOR_HISTORY_TURNS = 12;
