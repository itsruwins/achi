import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth/queries";
import {
  EmptyDocumentError,
  MAX_UPLOAD_BYTES,
  SUPPORTED_EXTENSIONS,
  UnsupportedFileError,
  extractDocument,
} from "@/features/ai/extract";
import { MAX_UPLOAD_CHARS } from "@/features/ai/limits";

/**
 * Turn an uploaded document into plain text.
 *
 * Deliberately separate from /api/generate and free of AI quota: extraction is
 * not a model call, and the user gets to read what came out — and fix it —
 * before deciding to spend a generation on it. Bundling the two would burn an
 * allowance on a PDF that turned out to be a scan with no text layer.
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

  // Checked before reading the body into memory.
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `That file is over ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB. Try a single chapter rather than the whole book.`,
      },
      { status: 413 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractDocument(file.name, bytes, MAX_UPLOAD_CHARS);

    return NextResponse.json({
      text: result.text,
      pages: result.pages ?? null,
      truncated: result.truncated,
      // The pre-truncation length, so the panel can say how much was dropped
      // rather than just that something was.
      originalLength: result.originalLength,
      filename: file.name,
    });
  } catch (error) {
    if (error instanceof UnsupportedFileError) {
      return NextResponse.json(
        { error: `Unsupported file type. Achi reads ${SUPPORTED_EXTENSIONS.join(", ")}.` },
        { status: 415 },
      );
    }

    if (error instanceof EmptyDocumentError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("[ai] extraction failed:", error);
    return NextResponse.json(
      { error: "Couldn't read that file. It may be corrupted or password-protected." },
      { status: 422 },
    );
  }
}
