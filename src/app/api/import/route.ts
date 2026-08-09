import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth/queries";
import { ApkgFormatError } from "@/features/transfer/apkg";
import {
  IMPORTABLE_EXTENSIONS,
  ImportFormatError,
  MAX_IMPORT_BYTES,
  importDocument,
} from "@/features/transfer/import";

/**
 * Read a deck file and return its cards for review.
 *
 * Nothing is saved here. The user sees what was parsed, can rename the deck and
 * drop cards, and saves in a separate step — the same shape as AI generation,
 * for the same reason: an import that writes straight to the library gives you
 * no chance to notice it read the file wrong.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  if (file.size > MAX_IMPORT_BYTES) {
    return NextResponse.json(
      {
        error: `That file is over ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB.`,
      },
      { status: 413 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const deck = await importDocument(file.name, bytes);

    return NextResponse.json({
      title: deck.title,
      description: deck.description,
      cards: deck.cards,
      notes: deck.notes,
      filename: file.name,
    });
  } catch (error) {
    // Both carry messages written for the person who picked the file.
    if (error instanceof ImportFormatError || error instanceof ApkgFormatError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("[transfer] import failed:", error);
    return NextResponse.json(
      {
        error: `Couldn't read that file. Achi imports ${IMPORTABLE_EXTENSIONS.join(", ")}.`,
      },
      { status: 422 },
    );
  }
}
