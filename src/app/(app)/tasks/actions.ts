"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { syncTaskToGoogleCalendar } from "@/lib/google-calendar";

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
  const dueTime = String(formData.get("due_time") ?? "").trim() || null;
  const priorityValue = String(formData.get("priority") ?? "normal");
  const priority = allowedPriorities.has(priorityValue) ? priorityValue : "normal";
  const reminderMinutes = parseReminderMinutes(formData.get("reminder_minutes"));

  const { error } = await supabase.from("tasks").insert({
    household_id: household.id,
    assigned_to: user.id,
    title,
    description,
    due_date: dueDate,
    due_time: dueTime,
    reminder_minutes: reminderMinutes,
    priority,
    status: "open"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createCalendarReminder(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  const reminderMinutes = parseReminderMinutes(formData.get("reminder_minutes"));

  if (!id) {
    return;
  }

  await syncTaskToGoogleCalendar(supabase, user.id, id, reminderMinutes);

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

function parseReminderMinutes(value: FormDataEntryValue | null) {
  const minutes = Number(value ?? 30);

  if (!Number.isFinite(minutes)) {
    return 30;
  }

  return Math.min(Math.max(Math.trunc(minutes), 0), 40320);
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
