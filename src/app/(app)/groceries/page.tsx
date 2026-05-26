import { Plus, Trash2 } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addGroceryItem, deleteGroceryItem, toggleGroceryItem } from "./actions";

type GroceryItem = {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  store: string | null;
  checked: boolean;
  created_at: string;
};

const categories = ["Produce", "Meat", "Dairy", "Pantry", "Frozen", "Household", "Other"];

export default async function GroceriesPage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const { data: items, error } = await supabase
    .from("grocery_items")
    .select("id, name, quantity, category, store, checked, created_at")
    .eq("household_id", household.id)
    .order("checked", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<GroceryItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  const openItems = items?.filter((item) => !item.checked) ?? [];
  const completedItems = items?.filter((item) => item.checked) ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Groceries</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Keep the shared list current from either phone. Checked items stay visible until deleted.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/70">
          {openItems.length} still needed
        </div>
      </div>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <form action={addGroceryItem} className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Item</span>
            <input
              required
              name="name"
              placeholder="Coffee, spinach, paper towels"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Quantity</span>
            <input
              name="quantity"
              placeholder="2 bags"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Category</span>
            <select
              name="category"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
              defaultValue=""
            >
              <option value="">Select</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Store</span>
            <input
              name="store"
              placeholder="Target"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <GroceryList title="Need to buy" items={openItems} />
        <GroceryList title="Checked off" items={completedItems} checkedList />
      </div>
    </div>
  );
}

function GroceryList({
  title,
  items,
  checkedList = false
}: {
  title: string;
  items: GroceryItem[];
  checkedList?: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink/55">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-6 text-center">
          <p className="text-sm font-medium text-ink">{checkedList ? "Nothing checked off yet" : "List is clear"}</p>
          <p className="mt-1 text-sm text-ink/55">
            {checkedList ? "Completed items will show up here." : "Add the first item above."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2"
            >
              <form action={toggleGroceryItem} className="flex min-w-0 flex-1 items-center gap-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="checked" value={String(!item.checked)} />
                <button
                  className="h-4 w-4 shrink-0 rounded border border-line bg-white ring-offset-2 hover:border-sage focus:outline-none focus:ring-2 focus:ring-sage"
                  aria-label={item.checked ? `Mark ${item.name} as needed` : `Mark ${item.name} as bought`}
                >
                  {item.checked ? <span className="block h-full w-full rounded-sm bg-sage" /> : null}
                </button>
                <div className="min-w-0">
                  <p className={item.checked ? "truncate text-sm font-medium text-ink/45 line-through" : "truncate text-sm font-medium text-ink"}>
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-ink/50">
                    {[item.quantity, item.category, item.store].filter(Boolean).join(" · ") || "No details"}
                  </p>
                </div>
              </form>
              <form action={deleteGroceryItem}>
                <input type="hidden" name="id" value={item.id} />
                <button
                  className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral"
                  aria-label={`Delete ${item.name}`}
                >
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
