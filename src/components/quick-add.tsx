"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, ListChecks, NotebookText, Plus, ShoppingCart, X } from "lucide-react";
import { quickAdd } from "@/app/(app)/quick-actions";

const modes = [
  { id: "task", label: "Task", icon: ListChecks },
  { id: "grocery", label: "Grocery", icon: ShoppingCart },
  { id: "expense", label: "Expense", icon: DollarSign },
  { id: "note", label: "Note", icon: NotebookText }
] as const;

type Mode = (typeof modes)[number]["id"];

export function QuickAdd() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("task");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      try {
        await quickAdd(formData);
        formRef.current?.reset();
        setOpen(false);
        router.refresh();
      } catch (quickAddError) {
        setError(quickAddError instanceof Error ? quickAddError.message : "Quick add failed.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-md bg-sage px-3 py-2 text-sm font-semibold text-paper hover:bg-sage/90"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Quick add</span>
        <span className="sm:hidden">Add</span>
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-20 z-30 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-line bg-panel p-4 shadow-lg sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[min(92vw,560px)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1 rounded-md bg-paper p-1">
              {modes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setMode(item.id)}
                  className={
                    mode === item.id
                      ? "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-semibold text-ink shadow-sm bg-panel"
                      : "inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium text-ink/60 hover:text-ink"
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-ink"
              aria-label="Close quick add"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
            <input type="hidden" name="kind" value={mode} />
            {mode === "task" ? <TaskFields /> : null}
            {mode === "grocery" ? <GroceryFields /> : null}
            {mode === "expense" ? <ExpenseFields /> : null}
            {mode === "note" ? <NoteFields /> : null}
            {error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}
            <button
              disabled={isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-sage px-4 text-sm font-semibold text-paper hover:bg-sage/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {isPending ? "Adding..." : `Add ${modes.find((item) => item.id === mode)?.label}`}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function TaskFields() {
  return (
    <>
      <TextInput required name="title" label="Task" placeholder="Schedule dentist appointment" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput name="description" label="Details" placeholder="Optional" />
        <DateInput name="due_date" label="Due date" />
      </div>
      <SelectInput name="priority" label="Priority" defaultValue="normal" options={["low", "normal", "high"]} />
    </>
  );
}

function GroceryFields() {
  return (
    <>
      <TextInput required name="name" label="Item" placeholder="Eggs" />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput name="quantity" label="Quantity" placeholder="1 dozen" />
        <SelectInput name="category" label="Category" defaultValue="" options={["Produce", "Meat", "Dairy", "Pantry", "Frozen", "Household", "Other"]} />
      </div>
    </>
  );
}

function ExpenseFields() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectInput name="type" label="Type" defaultValue="expense" options={["expense", "income"]} />
        <TextInput required name="amount" label="Amount" placeholder="24.99" type="number" />
        <DateInput name="transaction_date" label="Date" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectInput
          name="category"
          label="Category"
          defaultValue=""
          required
          options={["Groceries", "Dining out", "Utilities", "Transportation", "Income", "Home improvement", "Miscellaneous"]}
        />
        <TextInput name="merchant" label="Merchant" placeholder="Target" />
      </div>
      <TextInput name="note" label="Note" placeholder="Optional" />
    </>
  );
}

function NoteFields() {
  return (
    <>
      <TextInput required name="title" label="Title" placeholder="Gift idea for birthday" />
      <SelectInput name="category" label="Category" defaultValue="General" options={["General", "Date idea", "Gift idea", "Trip", "House project", "To discuss"]} />
      <label className="block">
        <span className="text-xs font-medium uppercase text-ink/50">Body</span>
        <textarea
          name="body"
          rows={3}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
          placeholder="Optional context"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input name="pinned" type="checkbox" className="h-4 w-4 accent-sage" />
        Pin note
      </label>
    </>
  );
}

function TextInput({
  name,
  label,
  placeholder,
  required = false,
  type = "text"
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "0.01" : undefined}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function DateInput({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input name={name} type="date" className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage" />
    </label>
  );
}

function SelectInput({
  name,
  label,
  options,
  defaultValue,
  required = false
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <select
        required={required}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
      >
        {defaultValue === "" ? <option value="">Select</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
