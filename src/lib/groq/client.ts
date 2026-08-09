import Groq from "groq-sdk";

/**
 * Groq client. Server-only.
 *
 * `GROQ_API_KEY` has no NEXT_PUBLIC_ prefix, so Next will not inline it into a
 * client bundle — importing this module from a client component is a build
 * error rather than a leaked key. Every call site is a route handler.
 */

/**
 * `openai/gpt-oss-120b` for both features.
 *
 * It is the only family on Groq with *strict* structured outputs — constrained
 * decoding, so the deck generator's JSON is schema-valid by construction rather
 * than by hoping and re-parsing. It is also the faster of the large models
 * (~500 tok/s), which is what the tutor stream is judged on.
 */
export const MODEL = "openai/gpt-oss-120b";

let client: Groq | null = null;

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GROQ_API_KEY. Add it to .env.local — see console.groq.com/keys.",
    );
  }

  // Reused across requests: the client is a thin HTTP wrapper holding a
  // connection pool, and rebuilding it per request throws that away.
  client ??= new Groq({ apiKey });
  return client;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}
