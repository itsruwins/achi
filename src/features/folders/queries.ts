import { createClient } from "@/lib/supabase/server";

export type Folder = {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
};

export async function listFolders(userId: string): Promise<Folder[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("folders")
    .select("id, name, color, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[folders] listFolders failed:", error.message);
    return [];
  }

  return data ?? [];
}
