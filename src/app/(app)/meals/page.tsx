import { CalendarPlus, ExternalLink, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import {
  addIngredient,
  addRecipe,
  addRecipeToGroceries,
  deleteMealPlanItem,
  deleteRecipe,
  planMeal
} from "./actions";

type Recipe = {
  id: string;
  title: string;
  source_url: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  instructions: string | null;
  notes: string | null;
  created_at: string;
  recipe_ingredients: Ingredient[];
};

type Ingredient = {
  id: string;
  name: string;
  quantity: string | null;
  sort_order: number;
};

type MealPlanItem = {
  id: string;
  meal_date: string;
  meal_type: string;
  notes: string | null;
  recipes: {
    title: string;
  } | null;
};

export default async function MealsPage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: recipes, error: recipesError }, { data: mealPlanItems, error: mealPlanError }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, title, source_url, prep_minutes, cook_minutes, servings, instructions, notes, created_at, recipe_ingredients(id, name, quantity, sort_order)")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false })
      .order("sort_order", { referencedTable: "recipe_ingredients", ascending: true })
      .returns<Recipe[]>(),
    supabase
      .from("meal_plan_items")
      .select("id, meal_date, meal_type, notes, recipes(title)")
      .eq("household_id", household.id)
      .gte("meal_date", today)
      .order("meal_date", { ascending: true })
      .limit(8)
      .returns<MealPlanItem[]>()
  ]);

  if (recipesError) {
    throw new Error(recipesError.message);
  }

  if (mealPlanError) {
    throw new Error(mealPlanError.message);
  }

  const recipeRows = recipes ?? [];
  const plannedMeals = mealPlanItems ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Meals</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Save recipes, collect ingredients, plan dinners, and send ingredients straight to groceries.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/70">
          {recipeRows.length} saved recipes
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <form action={addRecipe} className="grid gap-3 lg:grid-cols-[1fr_1fr_0.45fr_0.45fr_0.45fr]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Recipe</span>
            <input
              required
              name="title"
              placeholder="Lemon chicken bowls"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Source URL</span>
            <input
              name="source_url"
              type="url"
              placeholder="https://..."
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <NumberField name="servings" label="Servings" placeholder="4" />
          <NumberField name="prep_minutes" label="Prep" placeholder="15" />
          <NumberField name="cook_minutes" label="Cook" placeholder="30" />
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase text-ink/50">Instructions</span>
            <textarea
              name="instructions"
              rows={3}
              placeholder="Short version of how you make it"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-medium uppercase text-ink/50">Notes</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Double the sauce, use less salt, etc."
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
            <Plus className="h-4 w-4" />
            Save
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          {recipeRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
              <p className="text-sm font-medium text-ink">No recipes yet</p>
              <p className="mt-1 text-sm text-ink/55">Save a favorite meal above.</p>
            </div>
          ) : (
            recipeRows.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
          )}
        </section>

        <section className="space-y-4">
          <MealPlanner recipes={recipeRows} />
          <PlannedMeals items={plannedMeals} />
        </section>
      </div>
    </div>
  );
}

function NumberField({ name, label, placeholder }: { name: string; label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        name={name}
        type="number"
        min="1"
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const totalMinutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{recipe.title}</h2>
          <p className="mt-1 text-sm text-ink/55">
            {[recipe.servings ? `${recipe.servings} servings` : null, totalMinutes ? `${totalMinutes} min` : null]
              .filter(Boolean)
              .join(" · ") || "No timing details"}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {recipe.source_url ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-2 text-ink/55 hover:bg-paper hover:text-blue"
              aria-label={`Open source for ${recipe.title}`}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          <form action={addRecipeToGroceries}>
            <input type="hidden" name="recipe_id" value={recipe.id} />
            <button
              className="rounded-md p-2 text-ink/55 hover:bg-paper hover:text-gold"
              aria-label={`Add ${recipe.title} ingredients to groceries`}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </form>
          <form action={deleteRecipe}>
            <input type="hidden" name="recipe_id" value={recipe.id} />
            <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${recipe.title}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      {recipe.notes ? <p className="mt-3 rounded-md bg-paper p-3 text-sm text-ink/70">{recipe.notes}</p> : null}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-ink">Ingredients</h3>
        {recipe.recipe_ingredients.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">No ingredients yet.</p>
        ) : (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {recipe.recipe_ingredients.map((ingredient) => (
              <div key={ingredient.id} className="rounded-md bg-paper px-3 py-2 text-sm text-ink">
                {ingredient.quantity ? `${ingredient.name} · ${ingredient.quantity}` : ingredient.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={addIngredient} className="mt-4 grid gap-3 sm:grid-cols-[1fr_0.7fr_auto]">
        <input type="hidden" name="recipe_id" value={recipe.id} />
        <label className="block">
          <span className="text-xs font-medium uppercase text-ink/50">Ingredient</span>
          <input
            required
            name="name"
            placeholder="Chicken thighs"
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase text-ink/50">Quantity</span>
          <input
            name="quantity"
            placeholder="1.5 lb"
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
          />
        </label>
        <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-semibold text-ink hover:border-sage">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </form>
    </article>
  );
}

function MealPlanner({ recipes }: { recipes: Recipe[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarPlus className="h-5 w-5 text-sage" />
        <h2 className="text-lg font-semibold text-ink">Plan a meal</h2>
      </div>
      <form action={planMeal} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium uppercase text-ink/50">Recipe</span>
          <select
            required
            name="recipe_id"
            defaultValue=""
            className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
          >
            <option value="">Select</option>
            {recipes.map((recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Date</span>
            <input
              required
              name="meal_date"
              type="date"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Meal</span>
            <select
              name="meal_type"
              defaultValue="dinner"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium uppercase text-ink/50">Note</span>
          <input
            name="notes"
            placeholder="Make extra for lunch"
            className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
          />
        </label>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
          <Plus className="h-4 w-4" />
          Plan
        </button>
      </form>
    </section>
  );
}

function PlannedMeals({ items }: { items: MealPlanItem[] }) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Upcoming meals</h2>
        <span className="text-sm text-ink/55">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">No meals planned yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{item.recipes?.title ?? "Meal"}</p>
                <p className="truncate text-xs text-ink/50">
                  {[formatDate(item.meal_date), item.meal_type, item.notes].filter(Boolean).join(" · ")}
                </p>
              </div>
              <form action={deleteMealPlanItem}>
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label="Delete planned meal">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}
