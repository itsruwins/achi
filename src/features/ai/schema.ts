import * as z from "zod";

/**
 * The shape the model must return for a generated deck.
 *
 * Converted to JSON Schema and sent as Groq's strict `response_format`, so the
 * model is constrained by decoding rather than asked politely for JSON — no
 * output can arrive wrapped in a markdown fence or carrying a trailing comma.
 *
 * Field descriptions are part of the prompt: the model reads them. They are
 * written for the model, not as developer documentation.
 */
export const GeneratedCardSchema = z.object({
  front: z
    .string()
    .describe(
      "The question or prompt side. One idea only. Phrase it as a question or a term to define, never as a statement.",
    ),
  back: z
    .string()
    .describe(
      "The answer side. As short as it can be while still being correct — a phrase or a sentence, not a paragraph.",
    ),
  category: z
    .string()
    .describe(
      "A short topic label grouping related cards, e.g. 'Cell structure'. Reuse the same label across cards on the same topic. 2-4 words.",
    ),
  hint: z
    .string()
    .describe(
      "An optional nudge that points toward the answer without giving it away. Empty string when the card needs none.",
    ),
});

export const GeneratedDeckSchema = z.object({
  title: z
    .string()
    .describe("A short, specific deck name. No more than 60 characters."),
  description: z
    .string()
    .describe("One sentence on what this deck covers."),
  cards: z
    .array(GeneratedCardSchema)
    .describe("The flashcards, ordered so related cards sit together."),
});

export type GeneratedDeck = z.infer<typeof GeneratedDeckSchema>;
export type GeneratedCard = z.infer<typeof GeneratedCardSchema>;

/** What the client sends to /api/generate. */
export const GenerateRequestSchema = z.object({
  mode: z.enum(["topic", "notes"]),
  source: z.string().min(3).max(24_000),
  cardCount: z.number().int().min(5).max(50),
});
