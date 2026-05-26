"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

export async function renameHousehold(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return;
  }

  const { error } = await supabase.rpc("rename_household", {
    target_household_id: household.id,
    new_name: name
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function addHouseholdMember(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return;
  }

  const { error } = await supabase.rpc("add_household_member_by_email", {
    target_household_id: household.id,
    member_email: email
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function removeHouseholdMember(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const userId = String(formData.get("user_id") ?? "");

  if (!userId) {
    return;
  }

  const { error } = await supabase.rpc("remove_household_member", {
    target_household_id: household.id,
    member_user_id: userId
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}

export async function disconnectGoogleCalendar() {
  const { supabase, user } = await getCurrentUser();

  const { error } = await supabase.from("google_connections").delete().eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings");
}
