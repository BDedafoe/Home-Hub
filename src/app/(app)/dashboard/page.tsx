import { CheckCircle2, CircleDollarSign, ShoppingCart, Soup, StickyNote, Wrench } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

type DashboardTask = {
  id: string;
  title: string;
  due_date: string | null;
};

type DashboardGrocery = {
  id: string;
  name: string;
  quantity: string | null;
};

type DashboardTransaction = {
  type: "income" | "expense";
  amount: number;
  category: string;
};

type DashboardMeal = {
  id: string;
  meal_date: string;
  meal_type: string;
  recipes: {
    title: string;
  } | null;
};

type DashboardMaintenance = {
  id: string;
  title: string;
  due_date: string | null;
};

type DashboardNote = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
};

type DashboardBill = {
  id: string;
  name: string;
  amount: number | null;
  due_day: number | null;
  active: boolean;
};

export default async function DashboardPage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const today = new Date().toISOString().slice(0, 10);
  const { start, end } = getCurrentMonthRange();

  const [
    { data: tasks, error: tasksError },
    { data: groceryItems, error: groceriesError },
    { data: transactions, error: transactionsError },
    { data: meals, error: mealsError },
    { data: maintenance, error: maintenanceError },
    { data: notes, error: notesError },
    { data: bills, error: billsError }
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("household_id", household.id)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(4)
      .returns<DashboardTask[]>(),
    supabase
      .from("grocery_items")
      .select("id, name, quantity")
      .eq("household_id", household.id)
      .eq("checked", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<DashboardGrocery[]>(),
    supabase
      .from("transactions")
      .select("type, amount, category")
      .eq("household_id", household.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .returns<DashboardTransaction[]>(),
    supabase
      .from("meal_plan_items")
      .select("id, meal_date, meal_type, recipes(title)")
      .eq("household_id", household.id)
      .gte("meal_date", today)
      .order("meal_date", { ascending: true })
      .limit(3)
      .returns<DashboardMeal[]>(),
    supabase
      .from("maintenance_items")
      .select("id, title, due_date")
      .eq("household_id", household.id)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(3)
      .returns<DashboardMaintenance[]>(),
    supabase
      .from("notes")
      .select("id, title, body, category")
      .eq("household_id", household.id)
      .eq("pinned", true)
      .order("created_at", { ascending: false })
      .limit(2)
      .returns<DashboardNote[]>(),
    supabase
      .from("recurring_bills")
      .select("id, name, amount, due_day, active")
      .eq("household_id", household.id)
      .eq("active", true)
      .returns<DashboardBill[]>()
  ]);

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  if (groceriesError) {
    throw new Error(groceriesError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  if (mealsError) {
    throw new Error(mealsError.message);
  }

  if (maintenanceError) {
    throw new Error(maintenanceError.message);
  }

  if (notesError) {
    throw new Error(notesError.message);
  }

  if (billsError) {
    throw new Error(billsError.message);
  }

  const openTasks = tasks ?? [];
  const groceries = groceryItems ?? [];
  const monthlyTransactions = transactions ?? [];
  const plannedMeals = meals ?? [];
  const maintenanceItems = maintenance ?? [];
  const pinnedNotes = notes ?? [];
  const activeBills = (bills ?? []).filter((bill) => bill.due_day).sort(compareBillsByNextDueDate);
  const nextBill = activeBills[0];
  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const monthlyExpenses = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const topCategories = getTopExpenseCategories(monthlyTransactions).slice(0, 3);
  const dueTodayCount = openTasks.filter((task) => task.due_date === today).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-sm font-medium text-sage">{household.name}</p>
        <h1 className="mt-1 text-3xl font-semibold text-ink">Household dashboard</h1>
        <p className="mt-2 text-sm text-ink/65">
          Your shared command center for today&apos;s tasks, groceries, meals, and household notes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly spending" value={formatCurrency(monthlyExpenses)} detail={`${formatCurrency(monthlyIncome)} income`} />
        <StatCard label="Open tasks" value={String(openTasks.length)} detail={`${dueTodayCount} due today`} />
        <StatCard label="Grocery items" value={String(groceries.length)} detail="Still needed" />
        <StatCard
          label="Upcoming bills"
          value={String(activeBills.length)}
          detail={nextBill ? `${nextBill.name} due ${formatDate(toIsoDate(getNextBillDueDate(nextBill.due_day ?? 1)))}` : "No active bills"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold text-ink">Today</h2>
          </div>
          {openTasks.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No open tasks yet.</p>
          ) : (
            <div className="space-y-3">
              {openTasks.map((task) => (
                <div key={task.id} className="rounded-md border border-line px-3 py-2">
                  <p className="text-sm font-medium text-ink">{task.title}</p>
                  <p className="mt-1 text-xs text-ink/50">{task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-blue" />
            <h2 className="text-lg font-semibold text-ink">Money snapshot</h2>
          </div>
          {topCategories.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No transactions this month.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {topCategories.map((category) => (
                <div key={category.name} className="flex justify-between">
                  <span className="text-ink/60">{category.name}</span>
                  <span className="font-medium text-ink">{formatCurrency(category.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Soup className="h-5 w-5 text-coral" />
            <h2 className="text-lg font-semibold text-ink">Meal plan</h2>
          </div>
          {plannedMeals.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No meals planned yet.</p>
          ) : (
            <div className="space-y-3">
              {plannedMeals.map((meal) => (
                <div key={meal.id} className="flex justify-between rounded-md border border-line px-3 py-2">
                  <span className="text-sm text-ink/60">{formatDate(meal.meal_date)}</span>
                  <span className="text-sm font-medium text-ink">{meal.recipes?.title ?? meal.meal_type}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-semibold text-ink">Groceries</h2>
          </div>
          {groceries.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No grocery items needed.</p>
          ) : (
            <div className="space-y-2">
              {groceries.map((item) => (
                <div key={item.id} className="rounded-md bg-paper px-3 py-2 text-sm text-ink">
                  {item.quantity ? `${item.name} · ${item.quantity}` : item.name}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue" />
            <h2 className="text-lg font-semibold text-ink">Home maintenance</h2>
          </div>
          {maintenanceItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No maintenance reminders.</p>
          ) : (
            <div className="space-y-3">
              {maintenanceItems.map((item) => (
                <div key={item.id} className="rounded-md border border-line px-3 py-2">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-xs text-ink/50">{item.due_date ? `Due ${formatDate(item.due_date)}` : "No due date"}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-sage" />
            <h2 className="text-lg font-semibold text-ink">Pinned notes</h2>
          </div>
          {pinnedNotes.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-4 text-sm text-ink/60">No pinned notes yet.</p>
          ) : (
            <div className="space-y-3">
              {pinnedNotes.map((note) => (
                <div key={note.id} className="rounded-md border border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-ink">{note.title}</p>
                    <span className="shrink-0 text-xs text-ink/45">{note.category ?? "General"}</span>
                  </div>
                  {note.body ? <p className="mt-1 line-clamp-2 text-xs text-ink/55">{note.body}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  return { start, end };
}

function getTopExpenseCategories(transactions: DashboardTransaction[]) {
  const totals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + Number(transaction.amount));
    });

  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getNextBillDueDate(dueDay: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), clampBillDay(now.getFullYear(), now.getMonth(), dueDay));

  if (thisMonth >= today) {
    return thisMonth;
  }

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampBillDay(nextMonth.getFullYear(), nextMonth.getMonth(), dueDay));
}

function compareBillsByNextDueDate(a: DashboardBill, b: DashboardBill) {
  const aDate = a.due_day ? getNextBillDueDate(a.due_day).getTime() : Number.MAX_SAFE_INTEGER;
  const bDate = b.due_day ? getNextBillDueDate(b.due_day).getTime() : Number.MAX_SAFE_INTEGER;

  return aDate - bDate;
}

function clampBillDay(year: number, monthIndex: number, dueDay: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(dueDay, 1), lastDay);
}

function toIsoDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
