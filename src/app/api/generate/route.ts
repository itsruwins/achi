import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth/queries";
import {
  DAILY_GENERATION_LIMIT,
  maxSourceChars,
  outputTokenBudget,
} from "@/features/ai/limits";
import { toGroqSchema } from "@/features/ai/json-schema";
import { generationPrompt, generationSystem } from "@/features/ai/prompts";
import {
  consumeQuota,
  isJsonValidationFailure,
  isRateLimited,
  refundQuota,
} from "@/features/ai/quota";
import { GeneratedDeckSchema, GenerateRequestSchema } from "@/features/ai/schema";
import { getGroq, isGroqConfigured, MODEL } from "@/lib/groq/client";
import { createClient } from "@/lib/supabase/server";

/**
 * Generate a deck from a topic or pasted notes.
 *
 * Returns the cards without saving them — the user reviews and edits before
 * anything lands in their library. Saving is a separate, deliberate step.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "AI isn't configured on this server yet." },
      { status: 503 },
    );
  }

  const parsedBody = GenerateRequestSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "That request didn't look right." },
      { status: 400 },
    );
  }

  const { mode, source, cardCount, fidelity, filename } = parsedBody.data;

  // Enforced here, not just in the browser: input and reserved output share one
  // per-minute budget, so an oversized source is rejected by the provider with
  // an opaque error rather than a useful one. Checked before spending quota.
  const sourceLimit = maxSourceChars(cardCount);
  if (source.length > sourceLimit) {
    return NextResponse.json(
      {
        error: `That's ${source.length.toLocaleString()} characters. At ${cardCount} cards the limit is ${sourceLimit.toLocaleString()} — ask for fewer cards to fit more text, or split the document.`,
      },
      { status: 413 },
    );
  }

  // Charged up front. Charging on success would let anyone burn tokens for free
  // by cancelling requests before they complete.
  const quota = await consumeQuota("generation");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${DAILY_GENERATION_LIMIT} generations for today. They reset at midnight UTC.`,
      },
      { status: 429 },
    );
  }

  const supabase = await createClient();

  try {
    const completion = await getGroq().chat.completions.create({
      model: MODEL,
      // Sized to the card count, not a flat maximum: reserved output tokens
      // count against Groq's per-minute budget, so a fixed 16k reservation is
      // rejected before the prompt is even considered.
      max_completion_tokens: outputTokenBudget(cardCount),
      // Strict mode uses constrained decoding, so the response is schema-valid
      // by construction — there is no JSON parse that can fail on a stray
      // markdown fence or a trailing comma.
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "generated_deck",
          strict: true,
          schema: toGroqSchema(GeneratedDeckSchema),
        },
      },
      // "low", not "medium": measured on this model, medium spends ~40% more
      // completion tokens for the same number of cards, and those tokens come
      // out of the same budget the JSON needs. Not "none" either — that is
      // rejected outright when a response_format schema is attached.
      // `hidden` keeps reasoning out of `content`, which would otherwise break
      // the JSON that constrained decoding just guaranteed.
      reasoning_effort: "low",
      // Verbatim quoting is a copying task, and sampling is what makes a model
      // drift into paraphrase. Near-zero temperature is the single biggest
      // lever on whether the source's exact wording survives.
      temperature: fidelity === "verbatim" ? 0.1 : 0.6,
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: generationSystem(fidelity) },
        {
          role: "user",
          content: generationPrompt(mode, source, cardCount, fidelity, filename),
        },
      ],
    });

    const choice = completion.choices[0];
    const content = choice?.message?.content;

    // `length` means the model was cut off mid-object: strict decoding
    // guarantees the shape, not that it finished.
    if (choice?.finish_reason === "length") {
      await logGeneration(supabase, user.id, mode, source.length, 0, "truncated");
      return NextResponse.json(
        { error: "That was too much material at once. Try a shorter excerpt." },
        { status: 422 },
      );
    }

    if (!content) {
      await logGeneration(supabase, user.id, mode, source.length, 0, "empty");
      return NextResponse.json(
        { error: "No cards came back. Try giving it more to work with." },
        { status: 422 },
      );
    }

    // Validated rather than cast: strict mode is a guarantee from the provider,
    // and a guarantee from someone else is still an assumption here.
    const parsed = GeneratedDeckSchema.safeParse(JSON.parse(content));
    if (!parsed.success || parsed.data.cards.length === 0) {
      await logGeneration(supabase, user.id, mode, source.length, 0, "invalid");
      return NextResponse.json(
        { error: "The generated deck came back malformed. Try again." },
        { status: 422 },
      );
    }

    await logGeneration(
      supabase,
      user.id,
      mode,
      source.length,
      parsed.data.cards.length,
      "ok",
    );

    return NextResponse.json({ deck: parsed.data, remaining: quota.remaining });
  } catch (error) {
    // The model ran out of budget before producing valid JSON. Groq rejects the
    // whole request rather than returning a partial deck, so there is nothing
    // to salvage — but the user got nothing, so they keep their allowance.
    if (isJsonValidationFailure(error)) {
      await refundQuota("generation");
      await logGeneration(supabase, user.id, mode, source.length, 0, "json_invalid");

      return NextResponse.json(
        {
          error:
            "The deck came back incomplete — usually too much material for the number of cards. Try fewer cards or a shorter excerpt. This didn't use up a generation.",
        },
        { status: 422 },
      );
    }

    // Nothing was generated, so the allowance goes back.
    if (isRateLimited(error)) {
      await refundQuota("generation");
      await logGeneration(supabase, user.id, mode, source.length, 0, "rate_limited");

      return NextResponse.json(
        {
          error:
            "The AI service is at its per-minute limit. Wait about a minute and try again — this didn't use up a generation.",
        },
        { status: 429 },
      );
    }

    console.error("[ai] generation failed:", error);
    await refundQuota("generation");
    await logGeneration(supabase, user.id, mode, source.length, 0, "error");

    return NextResponse.json(
      { error: "Generation failed. Try again in a moment — this didn't use up a generation." },
      { status: 502 },
    );
  }
}

/** Records the SIZE of the input, never the input itself. */
async function logGeneration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  mode: string,
  inputChars: number,
  cardsGenerated: number,
  status: string,
) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    input_type: mode,
    input_chars: inputChars,
    cards_generated: cardsGenerated,
    model: MODEL,
    status,
  });
}
