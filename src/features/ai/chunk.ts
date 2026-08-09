/**
 * Splitting a long document into generatable pieces.
 *
 * The per-request ceiling is a hard provider limit, so the only way to handle a
 * document past it is several requests. Everything here is pure so the split
 * can be tested directly — a chunker that silently drops a paragraph loses
 * study material without anyone noticing.
 */

/**
 * Split text into chunks no larger than `maxChars`.
 *
 * Boundaries are chosen in descending order of preference: paragraph break,
 * then sentence end, then a hard cut. Cutting mid-sentence is a real cost —
 * the model makes a card out of a severed clause — so it is the last resort,
 * used only when a single sentence exceeds the whole budget.
 *
 * Every character of the input appears in exactly one chunk. Nothing is
 * dropped, deduplicated, or reordered.
 */
export function splitSource(text: string, maxChars: number): string[] {
  const source = text.trim();
  if (source.length === 0) return [];
  if (source.length <= maxChars) return [source];

  const chunks: string[] = [];
  let remaining = source;

  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);

    // Prefer a paragraph break in the back half of the window: splitting at the
    // very first break would make tiny chunks and multiply the request count.
    const half = Math.floor(maxChars / 2);
    let cut = window.lastIndexOf("\n\n");
    if (cut < half) cut = -1;

    if (cut === -1) {
      const sentence = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf(".\n"),
        window.lastIndexOf("? "),
        window.lastIndexOf("! "),
      );
      // +1 keeps the full stop with the sentence it ends.
      if (sentence >= half) cut = sentence + 1;
    }

    if (cut === -1) cut = maxChars;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Spread a card count across chunks in proportion to their length.
 *
 * An even split would ask for as many cards from a 200-character tail as from
 * a full-length chunk, and the model would pad the short one to comply.
 * Every chunk gets at least one card so no part of the document is ignored.
 */
export function allocateCards(
  chunks: string[],
  totalCards: number,
  minPerChunk = 1,
): number[] {
  if (chunks.length === 0) return [];
  if (chunks.length === 1) return [totalCards];

  const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0);

  const allocation = chunks.map((chunk) =>
    Math.max(minPerChunk, Math.round((chunk.length / totalChars) * totalCards)),
  );

  // Rounding drifts; settle the difference on the largest chunk, which has the
  // most material to give or spare.
  const drift = totalCards - allocation.reduce((sum, n) => sum + n, 0);
  if (drift !== 0) {
    let largest = 0;
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].length > chunks[largest].length) largest = i;
    }
    allocation[largest] = Math.max(minPerChunk, allocation[largest] + drift);
  }

  return allocation;
}

/**
 * Merge chunk results, dropping cards that ask the same question twice.
 *
 * Overlapping material across chunks — a term defined in one section and
 * recapped in another — otherwise produces duplicate cards, which are worse
 * than useless in review: they inflate the count and get rated twice.
 */
export function mergeCards<T extends { front: string }>(groups: T[][]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const group of groups) {
    for (const card of group) {
      const key = card.front
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(card);
    }
  }

  return merged;
}
