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

export async function updateTransactionCategory(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const month = getReturnMonth(formData);

  if (!id || !category) {
    return;
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      category,
      category_source: "manual"
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
  redirect(`/money?month=${month}`);
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
