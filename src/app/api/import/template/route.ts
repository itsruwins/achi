import { csvTemplate } from "@/features/transfer/export";

/** A starter CSV showing the expected columns. No auth needed — it's static. */
export async function GET() {
  return new Response(csvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="achi-cards-template.csv"',
    },
  });
}
