import { createClient } from "@/lib/supabase/server";

/** The live share token for a deck, if one has been created. */
export async function getShareToken(deckId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("deck_shares")
    .select("token")
    .eq("deck_id", deckId)
    .is("revoked_at", null)
    .maybeSingle();

  return (data?.token as string | undefined) ?? null;
}
