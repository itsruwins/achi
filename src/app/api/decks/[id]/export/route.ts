import { NextResponse } from "next/server";

import { requireOnboardedUser } from "@/features/auth/queries";
import { listCards } from "@/features/cards/queries";
import { getDeck } from "@/features/decks/queries";
import {
  buildCsvExport,
  buildJsonExport,
  safeDownloadName,
} from "@/features/transfer/export";

/**
 * Download a deck as JSON or CSV.
 *
 * The deck is read through RLS, so this exports what the caller is allowed to
 * see — their own decks, plus any shared one they could already read.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/decks/[id]/export">,
) {
  await requireOnboardedUser();

  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format") ?? "json";

  const deck = await getDeck(id);
  if (!deck) {
    return NextResponse.json({ error: "Deck not found." }, { status: 404 });
  }

  const cards = await listCards(deck.id);

  if (format === "csv") {
    return new Response(buildCsvExport(cards), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeDownloadName(deck.title, ".csv")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format !== "json") {
    return NextResponse.json(
      { error: "Supported formats are json and csv." },
      { status: 400 },
    );
  }

  const payload = buildJsonExport(deck, cards);

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeDownloadName(deck.title, ".achi.json")}"`,
      "Cache-Control": "no-store",
    },
  });
}
