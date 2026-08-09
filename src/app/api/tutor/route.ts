import { NextResponse } from "next/server";
import * as z from "zod";

import { getSessionUser } from "@/features/auth/queries";
import {
  DAILY_TUTOR_LIMIT,
  MAX_TUTOR_MESSAGE_CHARS,
  TUTOR_CONTEXT_CARDS,
  TUTOR_HISTORY_TURNS,
} from "@/features/ai/limits";
import { tutorSystem, wrapUntrusted } from "@/features/ai/prompts";
import { consumeQuota } from "@/features/ai/quota";
import { getGroq, isGroqConfigured, MODEL } from "@/lib/groq/client";
import { getDeck } from "@/features/decks/queries";
import { listCards } from "@/features/cards/queries";

const TutorRequestSchema = z.object({
  deckId: z.string().uuid(),
  message: z.string().min(1).max(MAX_TUTOR_MESSAGE_CHARS),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(TUTOR_HISTORY_TURNS * 2)
    .default([]),
});

/**
 * Deck-scoped tutor chat, streamed.
 *
 * Streams because a several-second wait with no output reads as broken. The
 * response is plain text rather than SSE — there is one text stream and no
 * events to multiplex, so a framing protocol would be ceremony.
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

  const parsed = TutorRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That message was empty or too long." },
      { status: 400 },
    );
  }

  const { deckId, message, history } = parsed.data;

  // Read the deck through RLS, so asking about someone else's private deck
  // returns nothing rather than leaking its contents into a prompt.
  const deck = await getDeck(deckId);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const quota = await consumeQuota("tutor");
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${DAILY_TUTOR_LIMIT} tutor messages for today. They reset at midnight UTC.`,
      },
      { status: 429 },
    );
  }

  const cards = await listCards(deckId);
  const context = cards
    .slice(0, TUTOR_CONTEXT_CARDS)
    .map((card, index) => `${index + 1}. Q: ${card.front}\n   A: ${card.back}`)
    .join("\n");

  const system = tutorSystem(deck.title, wrapUntrusted("deck cards", context));

  try {
    const stream = await getGroq().chat.completions.create({
      model: MODEL,
      max_completion_tokens: 2_000,
      stream: true,
      // A tutor reply is a short explanation and latency is what a chat UI is
      // judged on. `hidden` keeps the model's reasoning out of the visible
      // answer rather than streaming it at the user.
      reasoning_effort: "low",
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: system },
        ...history.map((turn) => ({
          role: turn.role,
          content: turn.content,
        })),
        { role: "user" as const, content: wrapUntrusted("question", message) },
      ],
    });

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } catch (error) {
          console.error("[ai] tutor stream failed:", error);
          controller.enqueue(
            encoder.encode("\n\n(Something went wrong mid-answer. Try again.)"),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // Without this a proxy may buffer the whole reply and defeat streaming.
        "Cache-Control": "no-store, no-transform",
        "X-Quota-Remaining": String(quota.remaining),
      },
    });
  } catch (error) {
    console.error("[ai] tutor failed:", error);
    return NextResponse.json(
      { error: "The tutor is unavailable right now." },
      { status: 502 },
    );
  }
}
