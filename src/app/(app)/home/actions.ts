"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

export async function addHomeAsset(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const category = String(formData.get("category") ?? "").trim() || null;
  const location = String(formData.get("location") ?? "").trim() || null;
  const purchaseDate = String(formData.get("purchase_date") ?? "").trim() || null;
  const warrantyExpires = String(formData.get("warranty_expires") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("home_assets").insert({
    household_id: household.id,
    name,
    category,
    location,
    purchase_date: purchaseDate,
    warranty_expires: warrantyExpires,
    notes
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
}

export async function deleteHomeAsset(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("home_assets").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
}

export async function addMaintenanceItem(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const repeatRule = String(formData.get("repeat_rule") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("maintenance_items").insert({
    household_id: household.id,
    title,
    due_date: dueDate,
    repeat_rule: repeatRule,
    notes,
    status: "open"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
  revalidatePath("/dashboard");
}

export async function toggleMaintenanceItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "done" ? "done" : "open";

  const { error } = await supabase.from("maintenance_items").update({ status }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
  revalidatePath("/dashboard");
}

export async function deleteMaintenanceItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
  revalidatePath("/dashboard");
}
