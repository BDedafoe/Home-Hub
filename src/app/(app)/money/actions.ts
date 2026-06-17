"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

const transactionTypes = new Set(["income", "expense"]);

export async function addTransaction(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const typeValue = String(formData.get("type") ?? "expense");
  const type = transactionTypes.has(typeValue) ? typeValue : "expense";
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  const category = String(formData.get("category") ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || !category) {
    return;
  }

  const merchant = String(formData.get("merchant") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const transactionDate = String(formData.get("transaction_date") ?? "").trim() || new Date().toISOString().slice(0, 10);
  const month = getReturnMonth(formData, transactionDate);

  const { error } = await supabase.from("transactions").insert({
    household_id: household.id,
    user_id: user.id,
    type,
    amount,
    category,
    merchant,
    note,
    transaction_date: transactionDate
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
  redirect(`/money?month=${month}`);
}

export async function deleteTransaction(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));
  const month = getReturnMonth(formData);

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
  redirect(`/money?month=${month}`);
}

export async function addRecurringBill(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const name = String(formData.get("name") ?? "").trim();
  const dueDay = Number(formData.get("due_day"));

  if (!name || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    return;
  }

  const amountValue = String(formData.get("amount") ?? "").replace(/,/g, "");
  const amount = amountValue ? Number(amountValue) : null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const autopay = formData.get("autopay") === "on";

  const { error } = await supabase.from("recurring_bills").insert({
    household_id: household.id,
    name,
    amount: amount && Number.isFinite(amount) && amount > 0 ? amount : null,
    category,
    due_day: dueDay,
    autopay,
    active: true
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
}

function getReturnMonth(formData: FormData, fallbackDate?: string) {
  const month = String(formData.get("month") ?? "");

  if (/^\d{4}-\d{2}$/.test(month)) {
    return month;
  }

  if (fallbackDate && /^\d{4}-\d{2}-\d{2}$/.test(fallbackDate)) {
    return fallbackDate.slice(0, 7);
  }

  return new Date().toISOString().slice(0, 7);
}

export async function toggleRecurringBill(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";

  if (!id) {
    return;
  }

  const { error } = await supabase.from("recurring_bills").update({ active }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
}

export async function deleteRecurringBill(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  const { error } = await supabase.from("recurring_bills").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
}
