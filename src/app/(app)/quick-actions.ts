"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

const taskPriorities = new Set(["low", "normal", "high"]);
const transactionTypes = new Set(["income", "expense"]);
const noteCategories = new Set(["General", "Date idea", "Gift idea", "Trip", "House project", "To discuss"]);

export async function quickAdd(formData: FormData) {
  const kind = String(formData.get("kind"));

  if (kind === "task") {
    await quickAddTask(formData);
    return;
  }

  if (kind === "grocery") {
    await quickAddGrocery(formData);
    return;
  }

  if (kind === "expense") {
    await quickAddTransaction(formData);
    return;
  }

  if (kind === "note") {
    await quickAddNote(formData);
  }
}

async function quickAddTask(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const priorityValue = String(formData.get("priority") ?? "normal");

  const { error } = await supabase.from("tasks").insert({
    household_id: household.id,
    assigned_to: user.id,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    priority: taskPriorities.has(priorityValue) ? priorityValue : "normal",
    status: "open"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

async function quickAddGrocery(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const { error } = await supabase.from("grocery_items").insert({
    household_id: household.id,
    added_by: user.id,
    name,
    quantity: String(formData.get("quantity") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/groceries");
  revalidatePath("/dashboard");
}

async function quickAddTransaction(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  const category = String(formData.get("category") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || !category) {
    return;
  }

  const typeValue = String(formData.get("type") ?? "expense");

  const { error } = await supabase.from("transactions").insert({
    household_id: household.id,
    user_id: user.id,
    type: transactionTypes.has(typeValue) ? typeValue : "expense",
    amount,
    category,
    merchant: String(formData.get("merchant") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    transaction_date: String(formData.get("transaction_date") ?? "").trim() || new Date().toISOString().slice(0, 10)
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
}

async function quickAddNote(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const categoryValue = String(formData.get("category") ?? "General");

  const { error } = await supabase.from("notes").insert({
    household_id: household.id,
    created_by: user.id,
    title,
    body: String(formData.get("body") ?? "").trim() || null,
    category: noteCategories.has(categoryValue) ? categoryValue : "General",
    pinned: formData.get("pinned") === "on"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/notes");
  revalidatePath("/dashboard");
}
