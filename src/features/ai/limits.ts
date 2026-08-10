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
export const CARD_COUNT_OPTIONS = [5, 10, 15, 20, 30] as const;
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

/** Rough overhead of the system prompt, schema, and JSON scaffolding. */
const PROMPT_OVERHEAD_TOKENS = 800;

/** Headroom, because character-to-token is an estimate and not a promise. */
const SAFETY_TOKENS = 500;

/**
 * Characters per token.
 *
 * Measured against this model, not assumed: clean English prose came out at
 * 5.2 chars/token across 20k–40k character samples. Technical material —
 * code, formulae, tables, heavy punctuation — tokenizes denser, closer to 3.5.
 *
 * 4.2 sits between the two. Erring low costs a little unused headroom; erring
 * high means the provider rejects the request outright, so the asymmetry is
 * deliberate. A dense document near the limit can still be refused, which the
 * route handles by refunding the allowance and saying so.
 */
const CHARS_PER_TOKEN = 4.2;

/**
 * How much source text fits alongside the requested number of cards.
 *
 * The per-minute budget is shared between input and reserved output, so this is
 * a trade rather than a constant: ask for fewer cards and more of the document
 * fits. A flat cap sized for the largest card count — which is what this was
 * originally — needlessly limits the common case.
 *
 *    5 cards → ~21,600 characters
 *   10 cards → ~18,500
 *   15 cards → ~15,300
 *   20 cards → ~12,200
 *   30 cards →  ~9,200
 *
 * The hard ceiling is the whole per-minute budget: about 41,000 characters of
 * clean prose with nothing reserved for output, which is not a usable request.
 * Raising these for real means raising GROQ_TPM_BUDGET — a paid Groq tier. No
 * prompt change gets around it.
 */
export function maxSourceChars(cardCount: number): number {
  const available =
    GROQ_TPM_BUDGET -
    PROMPT_OVERHEAD_TOKENS -
    SAFETY_TOKENS -
    outputTokenBudget(cardCount);

  return Math.max(3_000, Math.floor(available * CHARS_PER_TOKEN));
}

/**
 * The largest source that fits in a *single* pass, at the most generous card
 * count. Only meaningful as a default before the user picks a card count.
 */
export const MAX_SOURCE_CHARS = maxSourceChars(
  Math.min(...CARD_COUNT_OPTIONS),
);

/**
 * How much text is kept when reading an uploaded file.
 *
 * Deliberately *not* MAX_SOURCE_CHARS. That is the per-request ceiling, and
 * chunking already works around it by splitting the source into several passes
 * — so capping extraction at one pass' worth threw away material the generator
 * was perfectly able to handle. It also made upload behave differently from
 * paste, which had no ceiling at all.
 *
 * The real constraint is not the provider's per-request limit, it is time and
 * the daily allowance: each pass needs RATE_LIMIT_PAUSE_MS between it and the
 * next, and costs one generation. At ~15,300 characters per pass that puts
 * 100,000 characters at roughly seven passes and seven minutes — a full lecture
 * PDF or a chapter, finishing while you wait, using about a third of a day's
 * allowance.
 *
 * Raising this is a one-line change, but read `estimatePasses` first: past
 * about 300,000 characters a document needs more passes than a day's allowance
 * has, and the run cannot finish.
 */
export const MAX_UPLOAD_CHARS = 100_000;

/**
 * What a document will cost before anything is spent.
 *
 * Returned up front so the generator can show the price — passes, minutes,
 * generations — and let someone decide, rather than starting a twelve-minute
 * job without warning or failing halfway through for want of allowance.
 */
export function estimateRun(
  sourceLength: number,
  cardCount: number,
  pauseMs: number,
): { passes: number; minutes: number } {
  const perPass = maxSourceChars(cardCount);
  const passes = Math.max(1, Math.ceil(sourceLength / perPass));

  // Each pass is a request plus, between passes, a wait for the token bucket
  // to refill. The last pass has no wait after it.
  const seconds = passes * 5 + (passes - 1) * (pauseMs / 1000);

  return { passes, minutes: Math.max(1, Math.round(seconds / 60)) };
}
export const MAX_TUTOR_MESSAGE_CHARS = 500;

/** How many cards of deck context the tutor is given. */
export const TUTOR_CONTEXT_CARDS = 40;

/** Turns of chat history kept in a tutor conversation. */
export const TUTOR_HISTORY_TURNS = 12;
