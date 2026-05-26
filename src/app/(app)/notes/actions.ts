"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

const noteCategories = new Set(["General", "Date idea", "Gift idea", "Trip", "House project", "To discuss"]);

export async function addNote(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const body = String(formData.get("body") ?? "").trim() || null;
  const categoryValue = String(formData.get("category") ?? "General");
  const category = noteCategories.has(categoryValue) ? categoryValue : "General";
  const pinned = formData.get("pinned") === "on";

  const { error } = await supabase.from("notes").insert({
    household_id: household.id,
    created_by: user.id,
    title,
    body,
    category,
    pinned
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function toggleNotePinned(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));
  const pinned = String(formData.get("pinned")) === "true";

  const { error } = await supabase.from("notes").update({ pinned }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function deleteNote(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notes");
  revalidatePath("/dashboard");
}
