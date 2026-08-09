"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/features/auth/queries";

export type FolderFormState = {
  error?: string;
};

async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user.id;
}

export async function createFolder(
  _prev: FolderFormState,
  formData: FormData,
): Promise<FolderFormState> {
  const userId = await requireUserId();
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "Name the folder." };
  if (name.length > 60) return { error: "At most 60 characters." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("folders")
    .insert({ user_id: userId, name });

  if (error) {
    // 23505 = unique_violation on (user_id, lower(name)).
    if (error.code === "23505") return { error: "You already have that folder." };
    return { error: error.message };
  }

  revalidatePath("/decks");
  return {};
}

export async function renameFolder(formData: FormData) {
  const userId = await requireUserId();
  const folderId = String(formData.get("folderId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name || name.length > 60) return;

  const supabase = await createClient();
  await supabase
    .from("folders")
    .update({ name })
    .eq("id", folderId)
    .eq("user_id", userId);

  revalidatePath("/decks");
}

/**
 * Deleting a folder does not delete its decks — the FK is ON DELETE SET NULL,
 * so they fall back to the ungrouped list. Losing a semester of decks because
 * you tidied up a folder would be an unpleasant surprise.
 */
export async function deleteFolder(formData: FormData) {
  const userId = await requireUserId();
  const folderId = String(formData.get("folderId") ?? "");

  const supabase = await createClient();
  await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);

  revalidatePath("/decks");
  redirect("/decks");
}
