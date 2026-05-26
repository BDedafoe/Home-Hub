"use server";

import { revalidatePath } from "next/cache";
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
}

export async function deleteTransaction(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/money");
  revalidatePath("/dashboard");
}
