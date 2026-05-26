"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

export async function addGroceryItem(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const quantity = String(formData.get("quantity") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const store = String(formData.get("store") ?? "").trim() || null;

  const { error } = await supabase.from("grocery_items").insert({
    household_id: household.id,
    added_by: user.id,
    name,
    quantity,
    category,
    store
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
  revalidatePath("/dashboard");
}

export async function toggleGroceryItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));
  const checked = String(formData.get("checked")) === "true";

  const { error } = await supabase.from("grocery_items").update({ checked }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
  revalidatePath("/dashboard");
}

export async function deleteGroceryItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("grocery_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
  revalidatePath("/dashboard");
}
