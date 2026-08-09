import "server-only";

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  keepUsableCards,
  stripHtml,
  titleFromFilename,
  type ImportedDeck,
  type TransferCard,
} from "./format";

/**
 * Read an Anki `.apkg` export.
 *
 * An .apkg is a zip holding a SQLite database of notes. Cards live in `notes`,
 * whose `flds` column is the note's fields joined by U+001F — Anki's field
 * separator. Field 0 is the front and field 1 the back for the standard Basic
 * note type, which is what a shared deck almost always uses.
 *
 * SQLite comes from `node:sqlite`, built into Node 22+, so this needs no native
 * module and no wasm blob.
 */

const ANKI_FIELD_SEPARATOR = "";

/** Anki's newer, zstd-compressed collection. Not readable without a decompressor. */
const MODERN_COLLECTION = "collection.anki21b";

/** Plain-SQLite collections, newest first. */
const LEGACY_COLLECTIONS = ["collection.anki21", "collection.anki2"];

export class ApkgFormatError extends Error {}

export async function parseApkg(
  filename: string,
  bytes: Uint8Array,
): Promise<ImportedDeck> {
  const JSZip = (await import("jszip")).default;

  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new ApkgFormatError("That file isn't a readable .apkg archive.");
  }

  const collectionName = LEGACY_COLLECTIONS.find((name) => zip.files[name]);

  if (!collectionName) {
    if (zip.files[MODERN_COLLECTION]) {
      // Anki 2.1.50+ compresses the collection with zstd by default. Rather
      // than pull in a decompressor for a format the exporter can opt out of,
      // tell the user which checkbox to tick.
      throw new ApkgFormatError(
        "This deck was exported in Anki's newer compressed format. Re-export it from Anki with “Support older Anki versions” ticked, then try again.",
      );
    }
    throw new ApkgFormatError("No Anki collection found inside that file.");
  }

  const collectionBytes = await zip.files[collectionName].async("uint8array");

  // node:sqlite opens a path, not a buffer, so the collection is spilled to a
  // private temp directory and removed in `finally` — including on failure.
  const directory = await mkdtemp(join(tmpdir(), "achi-apkg-"));
  const path = join(directory, collectionName);

  try {
    await writeFile(path, collectionBytes);

    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(path, { readOnly: true });

    try {
      const rows = db.prepare("select flds from notes").all() as {
        flds: string;
      }[];

      const notes: string[] = [];
      const cards: TransferCard[] = [];
      let sawMedia = false;

      for (const row of rows) {
        const raw = String(row.flds ?? "");

        // Checked on the raw field: stripHtml removes <img> entirely, so
        // testing the cleaned text would never match and the warning would
        // never fire.
        if (/\[sound:|<img/i.test(raw)) sawMedia = true;

        const fields = raw.split(ANKI_FIELD_SEPARATOR);
        const front = stripHtml(fields[0] ?? "");
        const back = stripHtml(fields.slice(1).join("\n").trim());

        cards.push({ front, back, category: null, hint: null });
      }

      const usable = keepUsableCards(cards);
      const dropped = cards.length - usable.length;

      if (dropped > 0) {
        notes.push(
          `${dropped} ${dropped === 1 ? "note was" : "notes were"} empty after removing formatting and ${dropped === 1 ? "was" : "were"} skipped.`,
        );
      }

      // Media is deliberately not imported: images live in the archive under
      // numeric names mapped by a `media` manifest, and re-hosting them would
      // mean uploading someone else's files into this user's storage.
      if (sawMedia) {
        notes.push(
          "Some cards referenced images or audio. Only their text was imported.",
        );
      }

      return {
        title: titleFromFilename(filename),
        description: null,
        cards: usable,
        notes,
      };
    } finally {
      db.close();
    }
  } catch (error) {
    if (error instanceof ApkgFormatError) throw error;
    throw new ApkgFormatError(
      "Couldn't read the notes out of that Anki deck. It may use an unusual note type.",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
