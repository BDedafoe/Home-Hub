"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

export async function addRecipe(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return;
  }

  const sourceUrl = String(formData.get("source_url") ?? "").trim() || null;
  const servings = parseOptionalInteger(formData.get("servings"));
  const prepMinutes = parseOptionalInteger(formData.get("prep_minutes"));
  const cookMinutes = parseOptionalInteger(formData.get("cook_minutes"));
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("recipes").insert({
    household_id: household.id,
    title,
    source_url: sourceUrl,
    servings,
    prep_minutes: prepMinutes,
    cook_minutes: cookMinutes,
    instructions,
    notes
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
}

export async function addIngredient(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const recipeId = String(formData.get("recipe_id"));
  const name = String(formData.get("name") ?? "").trim();

  if (!recipeId || !name) {
    return;
  }

  const quantity = String(formData.get("quantity") ?? "").trim() || null;

  const { error } = await supabase.from("recipe_ingredients").insert({
    recipe_id: recipeId,
    name,
    quantity
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
}

export async function deleteRecipe(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const recipeId = String(formData.get("recipe_id"));

  const { error } = await supabase.from("recipes").delete().eq("id", recipeId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

export async function addRecipeToGroceries(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const recipeId = String(formData.get("recipe_id"));

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("recipe_ingredients")
    .select("name, quantity")
    .eq("recipe_id", recipeId)
    .order("sort_order", { ascending: true })
    .returns<{ name: string; quantity: string | null }[]>();

  if (ingredientsError) {
    throw new Error(ingredientsError.message);
  }

  const rows =
    ingredients?.map((ingredient) => ({
      household_id: household.id,
      added_by: user.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      category: "Pantry"
    })) ?? [];

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("grocery_items").insert(rows);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
  revalidatePath("/groceries");
  revalidatePath("/dashboard");
}

export async function planMeal(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const recipeId = String(formData.get("recipe_id"));
  const mealDate = String(formData.get("meal_date") ?? "").trim();
  const mealType = String(formData.get("meal_type") ?? "dinner").trim() || "dinner";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!recipeId || !mealDate) {
    return;
  }

  const { error } = await supabase.from("meal_plan_items").insert({
    household_id: household.id,
    recipe_id: recipeId,
    meal_date: mealDate,
    meal_type: mealType,
    notes
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

export async function deleteMealPlanItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const id = String(formData.get("id"));

  const { error } = await supabase.from("meal_plan_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/meals");
  revalidatePath("/dashboard");
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
