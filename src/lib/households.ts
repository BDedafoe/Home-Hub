import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type HouseholdMembership = {
  household_id: string;
  households: {
    id: string;
    name: string;
  } | null;
};

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getOrCreateHousehold(user: User) {
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id, households(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<HouseholdMembership>();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership?.households) {
    return membership.households;
  }

  const fallbackName = user.email ? `${user.email.split("@")[0]}'s Home` : "My Home";

  const { data: household, error: householdError } = await supabase
    .rpc("create_household_for_current_user", { household_name: fallbackName })
    .single<{ id: string; name: string }>();

  if (householdError) {
    throw new Error(householdError.message);
  }

  return household;
}
