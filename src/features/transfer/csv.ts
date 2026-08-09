/**
 * RFC 4180 CSV, hand-rolled.
 *
 * Splitting on commas is the classic wrong answer: a field can contain a comma,
 * a newline, or a quote, and any of those turns a naive parse into silently
 * mangled cards. This is a character-level state machine, which is the only way
 * to get quoting right — and it is small enough to test exhaustively.
 */

/** Fields that need quoting: separator, quote, or any line break. */
function needsQuoting(value: string): boolean {
  return /[",\r\n]/.test(value);
}

function encodeField(value: string): string {
  if (!needsQuoting(value)) return value;
  // A literal quote is escaped by doubling it.
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv(rows: string[][]): string {
  // CRLF: Excel is the most common consumer of an exported CSV, and it is the
  // line ending the spec calls for.
  return rows.map((row) => row.map(encodeField).join(",")).join("\r\n");
}

/**
 * Parse CSV into rows.
 *
 * Handles quoted fields containing commas, newlines, and doubled quotes; both
 * CRLF and LF; and a UTF-8 BOM, which Excel writes and which would otherwise
 * become part of the first header name.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldWasQuoted = false;

  const endField = () => {
    row.push(field);
    field = "";
    fieldWasQuoted = false;
  };

  const endRow = () => {
    endField();
    // Skip rows that are entirely empty — a trailing newline is not a record.
    if (row.some((cell) => cell.length > 0)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // consume the escape partner
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    switch (char) {
      case '"':
        // A quote only opens a field at its start; mid-field it is literal.
        if (field.length === 0 && !fieldWasQuoted) {
          inQuotes = true;
          fieldWasQuoted = true;
        } else {
          field += char;
        }
        break;
      case ",":
        endField();
        break;
      case "\r":
        // Swallow CR so CRLF ends one row rather than one-and-a-blank.
        if (text[i + 1] === "\n") i++;
        endRow();
        break;
      case "\n":
        endRow();
        break;
      default:
        field += char;
    }
  }

  // Whatever is buffered when the input runs out is the last row.
  if (field.length > 0 || row.length > 0) endRow();

  return rows;
}

/** Column order of the importable/exportable card CSV. */
export const CSV_HEADERS = ["front", "back", "category", "hint"] as const;

/**
 * Map a header row onto our columns.
 *
 * Header names are matched case- and space-insensitively, and a few obvious
 * synonyms are accepted, because a CSV exported from somewhere else is far more
 * likely to say "Question"/"Answer" than "front"/"back". Returns null when the
 * first row does not look like a header at all — that file has data on line 1.
 */
export function mapHeaders(row: string[]): Record<string, number> | null {
  const aliases: Record<string, string> = {
    front: "front",
    question: "front",
    term: "front",
    q: "front",
    back: "back",
    answer: "back",
    definition: "back",
    a: "back",
    category: "category",
    topic: "category",
    tag: "category",
    tags: "category",
    hint: "hint",
    clue: "hint",
  };

  const mapping: Record<string, number> = {};

  row.forEach((cell, index) => {
    const key = aliases[cell.trim().toLowerCase().replace(/\s+/g, "")];
    // First column wins, so a file with both "question" and "front" is stable.
    if (key && !(key in mapping)) mapping[key] = index;
  });

  return "front" in mapping || "back" in mapping ? mapping : null;
}
