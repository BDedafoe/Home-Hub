import { CheckCircle2, Plus, Trash2, Wrench } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import {
  addHomeAsset,
  addMaintenanceItem,
  deleteHomeAsset,
  deleteMaintenanceItem,
  toggleMaintenanceItem
} from "./actions";

type HomeAsset = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  purchase_date: string | null;
  warranty_expires: string | null;
  notes: string | null;
  created_at: string;
};

type MaintenanceItem = {
  id: string;
  title: string;
  due_date: string | null;
  repeat_rule: string | null;
  status: "open" | "done" | "archived";
  notes: string | null;
  created_at: string;
};

const assetCategories = ["Appliance", "HVAC", "Plumbing", "Electrical", "Room", "Vehicle", "Outdoor", "Other"];
const repeatOptions = ["Monthly", "Quarterly", "Every 6 months", "Yearly", "As needed"];

export default async function HomePage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const [{ data: assets, error: assetsError }, { data: maintenance, error: maintenanceError }] = await Promise.all([
    supabase
      .from("home_assets")
      .select("id, name, category, location, purchase_date, warranty_expires, notes, created_at")
      .eq("household_id", household.id)
      .order("created_at", { ascending: false })
      .returns<HomeAsset[]>(),
    supabase
      .from("maintenance_items")
      .select("id, title, due_date, repeat_rule, status, notes, created_at")
      .eq("household_id", household.id)
      .neq("status", "archived")
      .order("status", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<MaintenanceItem[]>()
  ]);

  if (assetsError) {
    throw new Error(assetsError.message);
  }

  if (maintenanceError) {
    throw new Error(maintenanceError.message);
  }

  const assetRows = assets ?? [];
  const maintenanceRows = maintenance ?? [];
  const openMaintenance = maintenanceRows.filter((item) => item.status === "open");
  const doneMaintenance = maintenanceRows.filter((item) => item.status === "done");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Home</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Track home assets, warranty dates, maintenance reminders, and useful household reference details.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">{assetRows.length} assets</div>
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">
            {openMaintenance.length} reminders
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section className="space-y-4">
          <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Add home asset</h2>
            <form action={addHomeAsset} className="grid gap-3 sm:grid-cols-2">
              <TextField required name="name" label="Name" placeholder="Water heater" />
              <SelectField name="category" label="Category" options={assetCategories} />
              <TextField name="location" label="Location" placeholder="Basement" />
              <DateField name="purchase_date" label="Purchase date" />
              <DateField name="warranty_expires" label="Warranty expires" />
              <TextField name="notes" label="Notes" placeholder="Filter size, model number, contractor" />
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 sm:col-span-2">
                <Plus className="h-4 w-4" />
                Add asset
              </button>
            </form>
          </div>

          <AssetList assets={assetRows} />
        </section>

        <section className="space-y-4">
          <div className="rounded-lg border border-line bg-panel p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-ink">Add maintenance reminder</h2>
            <form action={addMaintenanceItem} className="grid gap-3 sm:grid-cols-2">
              <TextField required name="title" label="Reminder" placeholder="Change HVAC filter" />
              <DateField name="due_date" label="Due date" />
              <SelectField name="repeat_rule" label="Repeat" options={repeatOptions} />
              <TextField name="notes" label="Notes" placeholder="20x25x1 filter" />
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 sm:col-span-2">
                <Plus className="h-4 w-4" />
                Add reminder
              </button>
            </form>
          </div>

          <MaintenanceList title="Upcoming maintenance" items={openMaintenance} />
          <MaintenanceList title="Completed" items={doneMaintenance} doneList />
        </section>
      </div>
    </div>
  );
}

function TextField({
  name,
  label,
  placeholder,
  required = false
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        required={required}
        name={name}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function DateField({ name, label }: { name: string; label: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        name={name}
        type="date"
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssetList({ assets }: { assets: HomeAsset[] }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Home assets</h2>
        <span className="text-sm text-ink/55">{assets.length}</span>
      </div>
      {assets.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
          Add appliance, room, warranty, or contractor details above.
        </p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{asset.name}</p>
                <p className="mt-1 truncate text-xs text-ink/50">
                  {[asset.category, asset.location, asset.warranty_expires ? `Warranty ${formatDate(asset.warranty_expires)}` : null]
                    .filter(Boolean)
                    .join(" · ") || "No details"}
                </p>
                {asset.notes ? <p className="mt-2 text-sm text-ink/65">{asset.notes}</p> : null}
              </div>
              <form action={deleteHomeAsset}>
                <input type="hidden" name="id" value={asset.id} />
                <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${asset.name}`}>
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

function MaintenanceList({
  title,
  items,
  doneList = false
}: {
  title: string;
  items: MaintenanceItem[];
  doneList?: boolean;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <span className="text-sm text-ink/55">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
          {doneList ? "Completed reminders will show here." : "No maintenance reminders yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-2">
              <form action={toggleMaintenanceItem} className="flex min-w-0 flex-1 items-start gap-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value={item.status === "done" ? "open" : "done"} />
                <button
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border border-line bg-panel ring-offset-2 hover:border-sage focus:outline-none focus:ring-2 focus:ring-sage"
                  aria-label={item.status === "done" ? `Reopen ${item.title}` : `Complete ${item.title}`}
                >
                  {item.status === "done" ? <span className="block h-full w-full rounded-sm bg-sage" /> : null}
                </button>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p
                      className={
                        item.status === "done"
                          ? "truncate text-sm font-semibold text-ink/45 line-through"
                          : "truncate text-sm font-semibold text-ink"
                      }
                    >
                      {item.title}
                    </p>
                    {item.due_date ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue">
                        <Wrench className="h-3 w-3" />
                        {formatDate(item.due_date)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-ink/50">
                    {[item.repeat_rule, item.notes].filter(Boolean).join(" · ") || "No details"}
                  </p>
                </div>
              </form>
              <form action={deleteMaintenanceItem}>
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-coral" aria-label={`Delete ${item.title}`}>
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
