import Link from "next/link";
import { ArrowDownCircle, ArrowLeft, ArrowRight, ArrowUpCircle, CalendarDays, Plus, Trash2 } from "lucide-react";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { StatCard } from "@/components/stat-card";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addRecurringBill, addTransaction, deleteRecurringBill, deleteTransaction, toggleRecurringBill, updateTransactionCategory } from "./actions";

type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  merchant: string | null;
  note: string | null;
  transaction_date: string;
  created_at: string;
  source?: "manual" | "plaid";
  category_source?: "manual" | "plaid" | "homehub";
  synced_from?: "recurring";
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

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
};

type PlaidAccount = {
  id: string;
  name: string;
  mask: string | null;
  subtype: string | null;
  plaid_items: {
    institution_name: string | null;
  } | null;
};

const categories = [
  "Groceries",
  "Dining out",
  "Mortgage/Rent",
  "Rental Income",
  "Property Insurance",
  "Property Taxes",
  "HOA",
  "Utilities",
  "Maintenance",
  "Cleaning",
  "Transportation",
  "Health",
  "Subscriptions",
  "Home improvement",
  "Entertainment",
  "Travel",
  "Income",
  "Miscellaneous"
];

type MoneyPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function MoneyPage({ searchParams }: MoneyPageProps) {
  const params = await searchParams;
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const selectedMonth = parseMonthParam(params.month);
  const { start, end } = getMonthRange(selectedMonth);
  const { start: yearStart, end: yearEnd } = getYearRange(Number(selectedMonth.slice(0, 4)));

  const [
    { data: transactions, error },
    { data: yearTransactions, error: yearTransactionsError },
    { data: recurringBills, error: billsError },
    { data: plaidAccounts, error: plaidAccountsError }
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, amount, category, merchant, note, transaction_date, created_at, source, category_source")
      .eq("household_id", household.id)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Transaction[]>(),
    supabase
      .from("transactions")
      .select("id, type, amount, category, merchant, note, transaction_date, created_at, source, category_source")
      .eq("household_id", household.id)
      .gte("transaction_date", yearStart)
      .lte("transaction_date", yearEnd)
      .order("transaction_date", { ascending: false })
      .returns<Transaction[]>(),
    supabase
      .from("recurring_bills")
      .select("id, name, amount, category, due_day, autopay, active, created_at")
      .eq("household_id", household.id)
      .order("active", { ascending: false })
      .order("due_day", { ascending: true, nullsFirst: false })
      .returns<RecurringBill[]>(),
    supabase
      .from("plaid_accounts")
      .select("id, name, mask, subtype, plaid_items(institution_name)")
      .returns<PlaidAccount[]>()
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (yearTransactionsError) {
    throw new Error(yearTransactionsError.message);
  }

  if (billsError) {
    throw new Error(billsError.message);
  }

  if (plaidAccountsError) {
    throw new Error(plaidAccountsError.message);
  }

  const year = Number(selectedMonth.slice(0, 4));
  const bills = (recurringBills ?? []).sort(compareBillsByNextDueDate);
  const activeBills = bills.filter((bill) => bill.active);
  const recurringMonthRows = getRecurringTransactions(activeBills, selectedMonth);
  const recurringYearRows = getRecurringYearTransactions(activeBills, year);
  const rows = [...recurringMonthRows, ...(transactions ?? [])].sort(compareTransactionsByDate);
  const yearRows = [...recurringYearRows, ...(yearTransactions ?? [])];
  const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + Number(row.amount), 0);
  const expenses = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const net = income - expenses;
  const categoryTotals = getExpenseCategoryTotals(rows);
  const monthSummaries = getMonthSummaries(yearRows, year);
  const yearIncome = monthSummaries.reduce((sum, month) => sum + month.income, 0);
  const yearExpenses = monthSummaries.reduce((sum, month) => sum + month.expenses, 0);
  const previousMonth = shiftMonth(selectedMonth, -1);
  const nextMonth = shiftMonth(selectedMonth, 1);
  const connectedAccounts = plaidAccounts ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Money</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Track household income and spending by month. Plaid imports and recurring expenses are included automatically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/money?month=${previousMonth}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line px-3 text-ink/70 hover:bg-paper hover:text-ink"
            aria-label="Previous month"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <form action="/money" className="flex items-center gap-2">
            <input
              name="month"
              type="month"
              defaultValue={selectedMonth}
              className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-sage"
            />
            <button className="h-10 rounded-md border border-line px-3 text-sm font-medium text-ink/70 hover:bg-paper hover:text-ink">
              View
            </button>
          </form>
          <Link
            href={`/money?month=${nextMonth}`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line px-3 text-ink/70 hover:bg-paper hover:text-ink"
            aria-label="Next month"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section className="mb-5 flex flex-col justify-between gap-4 rounded-lg border border-line bg-panel p-4 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ink">Card sync</h2>
          <p className="mt-1 text-sm text-ink/60">
            Connect a credit card securely with Plaid. Imported transactions can still be manually recategorized.
          </p>
          {connectedAccounts.length > 0 ? (
            <p className="mt-2 text-xs text-ink/50">
              Connected:{" "}
              {connectedAccounts
                .map((account) =>
                  [account.plaid_items?.institution_name, account.name, account.mask ? `••${account.mask}` : null].filter(Boolean).join(" ")
                )
                .join(", ")}
            </p>
          ) : null}
        </div>
        <PlaidLinkButton />
      </section>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Income" value={formatCurrency(income)} detail={`${rows.filter((row) => row.type === "income").length} entries`} />
        <StatCard label="Expenses" value={formatCurrency(expenses)} detail={`${rows.filter((row) => row.type === "expense").length} entries`} />
        <StatCard label="Net" value={formatCurrency(net)} detail={formatMonthLabel(start)} />
      </div>

      {recurringMonthRows.length > 0 ? (
        <div className="mb-5 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-ink/75">
          <span className="font-semibold text-primary">{recurringMonthRows.length} recurring expenses</span> are synced into this month automatically.
        </div>
      ) : null}

      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <form action={addTransaction} className="grid gap-3 lg:grid-cols-[0.6fr_0.7fr_0.9fr_1fr_0.8fr_1fr_auto]">
          <input type="hidden" name="month" value={selectedMonth} />
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Type</span>
            <select
              name="type"
              defaultValue="expense"
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
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
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
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
          <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-ink">{selectedMonth.slice(0, 4)} monthly history</h2>
              <p className="mt-1 text-sm text-ink/55">
                {formatCurrency(yearIncome)} income · {formatCurrency(yearExpenses)} expenses
              </p>
            </div>
            <span className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink/60">
              Year net {formatCurrency(yearIncome - yearExpenses)}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {monthSummaries.map((month) => (
              <Link
                key={month.month}
                href={`/money?month=${month.month}`}
                className={
                  month.month === selectedMonth
                    ? "rounded-md border border-primary bg-primary/10 px-3 py-2"
                    : "rounded-md border border-line px-3 py-2 hover:bg-paper"
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{formatShortMonthLabel(month.month)}</p>
                  <p className={month.income - month.expenses >= 0 ? "text-xs font-medium text-income" : "text-xs font-medium text-coral"}>
                    {formatCurrency(month.income - month.expenses)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-ink/50">
                  {formatCurrency(month.income)} in · {formatCurrency(month.expenses)} out
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue" />
              <h2 className="text-lg font-semibold text-ink">Recurring expenses</h2>
          </div>
          <form action={addRecurringBill} className="grid gap-3 lg:grid-cols-[1fr_0.7fr_0.8fr_0.55fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-medium uppercase text-ink/50">Expense</span>
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
                className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
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
            <button className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          <div className="mt-4">
            {bills.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
                Add recurring expenses to automatically include them in every month.
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

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
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
                      className="h-2 rounded-full bg-income"
                      style={{ width: `${Math.max(8, Math.round((category.total / categoryTotals[0].total) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">{formatMonthLabel(start)} transactions</h2>
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
                <TransactionRow key={transaction.id} transaction={transaction} month={selectedMonth} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TransactionRow({ transaction, month }: { transaction: Transaction; month: string }) {
  const isIncome = transaction.type === "income";
  const generated = Boolean(transaction.synced_from);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {isIncome ? <ArrowUpCircle className="h-5 w-5 shrink-0 text-income" /> : <ArrowDownCircle className="h-5 w-5 shrink-0 text-coral" />}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{transaction.merchant || transaction.category}</p>
          <p className="truncate text-xs text-ink/50">
            {[transaction.category, formatDate(transaction.transaction_date), transaction.note].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!generated ? (
          <form action={updateTransactionCategory} className="flex items-center gap-1">
            <input type="hidden" name="id" value={transaction.id} />
            <input type="hidden" name="month" value={month} />
            <select
              name="category"
              defaultValue={transaction.category}
              className="h-9 rounded-md border border-line bg-panel px-2 text-xs outline-none focus:border-sage"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button className="h-9 rounded-md border border-line px-2 text-xs font-medium text-ink/65 hover:bg-paper hover:text-ink">
              Save
            </button>
          </form>
        ) : null}
        <span className={isIncome ? "text-sm font-semibold text-income" : "text-sm font-semibold text-ink"}>
          {isIncome ? "+" : "-"}
          {formatCurrency(Number(transaction.amount))}
        </span>
        {transaction.synced_from ? (
          <span
            className={
              "rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"
            }
          >
            Recurring
          </span>
        ) : transaction.source === "plaid" ? (
          <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-xs font-semibold text-blue">Plaid</span>
        ) : (
          <form action={deleteTransaction}>
            <input type="hidden" name="id" value={transaction.id} />
            <input type="hidden" name="month" value={month} />
            <button
              className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral"
              aria-label={`Delete ${transaction.merchant || transaction.category}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        )}
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

function getRecurringYearTransactions(bills: RecurringBill[], year: number): Transaction[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`).flatMap((month) =>
    getRecurringTransactions(bills, month)
  );
}

function getRecurringTransactions(bills: RecurringBill[], month: string): Transaction[] {
  return bills
    .map((bill) => recurringTransaction(bill, month))
    .filter((entry): entry is Transaction => Boolean(entry));
}

function recurringTransaction(bill: RecurringBill, month: string): Transaction | null {
  const amount = Number(bill.amount ?? 0);

  if (!bill.active || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    id: `recurring:${bill.id}:${month}`,
    type: "expense",
    amount,
    category: bill.category || "Miscellaneous",
    merchant: bill.name,
    note: bill.autopay ? "Recurring expense · Autopay" : "Recurring expense",
    transaction_date: getRecurringTransactionDate(month, bill.due_day),
    created_at: `${month}-01T00:00:00.000Z`,
    synced_from: "recurring" as const
  };
}

function compareTransactionsByDate(a: Transaction, b: Transaction) {
  const dateComparison = b.transaction_date.localeCompare(a.transaction_date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return b.created_at.localeCompare(a.created_at);
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

function parseMonthParam(value: string | undefined) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return new Date().toISOString().slice(0, 7);
}

function getMonthRange(month: string) {
  const [year, monthValue] = month.split("-").map(Number);
  const start = toIsoDate(new Date(year, monthValue - 1, 1));
  const end = toIsoDate(new Date(year, monthValue, 0));

  return { start, end };
}

function getYearRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`
  };
}

function shiftMonth(month: string, offset: number) {
  const [year, monthValue] = month.split("-").map(Number);
  const date = new Date(year, monthValue - 1 + offset, 1);

  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0")].join("-");
}

function getMonthSummaries(transactions: Transaction[], year: number): MonthSummary[] {
  const summaries = Array.from({ length: 12 }, (_, index) => ({
    month: [year, String(index + 1).padStart(2, "0")].join("-"),
    income: 0,
    expenses: 0
  }));

  transactions.forEach((transaction) => {
    const month = transaction.transaction_date.slice(0, 7);
    const summary = summaries.find((item) => item.month === month);

    if (!summary) {
      return;
    }

    if (transaction.type === "income") {
      summary.income += Number(transaction.amount);
    } else {
      summary.expenses += Number(transaction.amount);
    }
  });

  return summaries;
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

function formatShortMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short" }).format(date);
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

function getRecurringTransactionDate(month: string, dueDay: number | null) {
  const [year, monthValue] = month.split("-").map(Number);
  const day = dueDay ? clampBillDay(year, monthValue - 1, dueDay) : 1;

  return [year, String(monthValue).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
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
