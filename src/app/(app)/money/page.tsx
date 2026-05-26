import { ArrowDownCircle, ArrowUpCircle, CalendarDays, Plus, Trash2 } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addRecurringBill, addTransaction, deleteRecurringBill, deleteTransaction, toggleRecurringBill } from "./actions";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  merchant: string | null;
  note: string | null;
  transaction_date: string;
  created_at: string;
};

type RecurringBill = {
  id: string;
  name: string;
  amount: number | null;
  category: string | null;
  due_day: number | null;
  autopay: boolean;
  active: boolean;
  created_at: string;
};

const categories = [
  "Groceries",
  "Dining out",
  "Mortgage/Rent",
  "Utilities",
  "Transportation",
  "Health",
  "Subscriptions",
  "Home improvement",
  "Entertainment",
  "Travel",
  "Income",
  "Miscellaneous"
];

export default async function MoneyPage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const { start, end } = getCurrentMonthRange();

  const [{ data: transactions, error }, { data: recurringBills, error: billsError }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, category, merchant, note, transaction_date, created_at")
      .eq("household_id", household.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Transaction[]>(),
    supabase
      .from("recurring_bills")
      .select("id, name, amount, category, due_day, autopay, active, created_at")
      .eq("household_id", household.id)
      .order("active", { ascending: false })
      .order("due_day", { ascending: true, nullsFirst: false })
      .returns<RecurringBill[]>()
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (billsError) {
    throw new Error(billsError.message);
  }

  const rows = transactions ?? [];
  const bills = (recurringBills ?? []).sort(compareBillsByNextDueDate);
  const activeBills = bills.filter((bill) => bill.active);
  const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const expenses = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const net = income - expenses;
  const categoryTotals = getExpenseCategoryTotals(rows);
  const billTotal = activeBills.reduce((sum, bill) => sum + Number(bill.amount ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Money</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Track household income and spending for the current month.
          </p>
        </div>
        <div className="rounded-md border border-line bg-white px-3 py-2 text-sm text-ink/70">
          {formatMonthLabel(start)}
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={formatCurrency(income)} detail={`${rows.filter((row) => row.type === "income").length} entries`} />
        <StatCard label="Expenses" value={formatCurrency(expenses)} detail={`${rows.filter((row) => row.type === "expense").length} entries`} />
        <StatCard label="Upcoming bills" value={String(activeBills.length)} detail={`${formatCurrency(billTotal)} scheduled`} />
      </div>

      <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <form action={addTransaction} className="grid gap-3 lg:grid-cols-[0.6fr_0.7fr_0.9fr_1fr_0.8fr_1fr_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Type</span>
            <select
              name="type"
              defaultValue="expense"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Amount</span>
            <input
              required
              min="0.01"
              step="0.01"
              name="amount"
              type="number"
              placeholder="42.50"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Category</span>
            <select
              required
              name="category"
              defaultValue=""
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
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
            <span className="text-xs font-medium uppercase text-ink/50">Merchant</span>
            <input
              name="merchant"
              placeholder="Costco"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Date</span>
            <input
              name="transaction_date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Note</span>
            <input
              name="note"
              placeholder="Optional"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue" />
            <h2 className="text-lg font-semibold text-ink">Recurring bills</h2>
          </div>
          <form action={addRecurringBill} className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.8fr_0.55fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-medium uppercase text-ink/50">Bill</span>
              <input
                required
                name="name"
                placeholder="Electric bill"
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-ink/50">Amount</span>
              <input
                min="0.01"
                step="0.01"
                name="amount"
                type="number"
                placeholder="125.00"
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-ink/50">Category</span>
              <select
                name="category"
                defaultValue=""
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-sage"
              >
                <option value="">Optional</option>
                {categories
                  .filter((category) => category !== "Income")
                  .map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase text-ink/50">Due day</span>
              <input
                required
                min="1"
                max="31"
                name="due_day"
                type="number"
                placeholder="15"
                className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
              />
            </label>
            <label className="mt-6 inline-flex h-10 items-center gap-2 text-sm text-ink/70">
              <input name="autopay" type="checkbox" className="h-4 w-4 rounded border-line text-sage" />
              Autopay
            </label>
            <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          <div className="mt-4">
            {bills.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
                Add recurring bills to track what is coming due.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {bills.map((bill) => (
                  <RecurringBillRow key={bill.id} bill={bill} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Expense categories</h2>
            <span className="text-sm text-ink/55">{categoryTotals.length}</span>
          </div>
          {categoryTotals.length === 0 ? (
            <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
              Expense totals will show here.
            </p>
          ) : (
            <div className="space-y-3">
              {categoryTotals.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-ink">{category.name}</span>
                    <span className="text-ink/65">{formatCurrency(category.total)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-paper">
                    <div
                      className="h-2 rounded-full bg-sage"
                      style={{ width: `${Math.max(8, Math.round((category.total / categoryTotals[0].total) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Transactions</h2>
            <span className="text-sm text-ink/55">{rows.length}</span>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-line p-6 text-center">
              <p className="text-sm font-medium text-ink">No transactions yet</p>
              <p className="mt-1 text-sm text-ink/55">Add your first income or expense above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === "income";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
      <div className="flex min-w-0 items-center gap-3">
        {isIncome ? <ArrowUpCircle className="h-5 w-5 shrink-0 text-sage" /> : <ArrowDownCircle className="h-5 w-5 shrink-0 text-coral" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{transaction.merchant || transaction.category}</p>
          <p className="truncate text-xs text-ink/50">
            {[transaction.category, formatDate(transaction.transaction_date), transaction.note].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={isIncome ? "text-sm font-semibold text-sage" : "text-sm font-semibold text-ink"}>
          {isIncome ? "+" : "-"}
          {formatCurrency(Number(transaction.amount))}
        </span>
        <form action={deleteTransaction}>
          <input type="hidden" name="id" value={transaction.id} />
          <button
            className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral"
            aria-label={`Delete ${transaction.merchant || transaction.category}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function RecurringBillRow({ bill }: { bill: RecurringBill }) {
  const nextDueDate = bill.due_day ? getNextBillDueDate(bill.due_day) : null;

  return (
    <div className={bill.active ? "rounded-md border border-line px-3 py-2" : "rounded-md border border-line bg-paper px-3 py-2 opacity-70"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{bill.name}</p>
          <p className="mt-1 truncate text-xs text-ink/50">
            {[
              bill.category,
              bill.amount ? formatCurrency(Number(bill.amount)) : null,
              nextDueDate ? `Due ${formatDate(toIsoDate(nextDueDate))}` : null,
              bill.autopay ? "Autopay" : "Manual"
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <form action={toggleRecurringBill}>
            <input type="hidden" name="id" value={bill.id} />
            <input type="hidden" name="active" value={bill.active ? "false" : "true"} />
            <button className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink/60 hover:bg-paper">
              {bill.active ? "Pause" : "Resume"}
            </button>
          </form>
          <form action={deleteRecurringBill}>
            <input type="hidden" name="id" value={bill.id} />
            <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${bill.name}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getExpenseCategoryTotals(transactions: Transaction[]) {
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

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  return { start, end };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function formatMonthLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date);
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

function compareBillsByNextDueDate(a: RecurringBill, b: RecurringBill) {
  if (a.active !== b.active) {
    return a.active ? -1 : 1;
  }

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
