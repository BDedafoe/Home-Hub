"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

const allowedPriorities = new Set(["low", "normal", "high"]);

export async function addTask(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const description = String(formData.get("description") ?? "").trim() || null;
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const priorityValue = String(formData.get("priority") ?? "normal");
  const priority = allowedPriorities.has(priorityValue) ? priorityValue : "normal";

  const { error } = await supabase.from("tasks").insert({
    household_id: household.id,
    assigned_to: user.id,
    title,
    description,
    due_date: dueDate,
    priority,
    status: "open"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function toggleTask(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) === "done" ? "done" : "open";

  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
