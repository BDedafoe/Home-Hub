import Link from "next/link";
import { Building2, Home, Plus } from "lucide-react";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { addProperty } from "./actions";

type Property = {
  id: string;
  address: string;
  status: "occupied" | "vacant" | "maintenance" | "listed";
  notes: string | null;
  created_at: string;
};

type PropertyTenant = {
  property_id: string;
  tenant_name: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
};

type PropertyFinancials = {
  property_id: string;
  mortgage: number;
  insurance: number;
  taxes: number;
  hoa: number;
  utilities: number;
  maintenance: number;
  cleaning: number;
  other_expenses: number;
  rent: number;
  late_fees: number;
  other_income: number;
};

const statusLabels = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
  listed: "Listed"
};

const statusClasses = {
  occupied: "border-income/40 bg-income/10 text-income",
  vacant: "border-gold/40 bg-gold/10 text-gold",
  maintenance: "border-primary/40 bg-primary/10 text-primary",
  listed: "border-blue/40 bg-blue/10 text-blue"
};

export default async function HomePage() {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select("id, address, status, notes, created_at")
    .eq("household_id", household.id)
    .order("created_at", { ascending: false })
    .returns<Property[]>();

  if (propertiesError) {
    throw new Error(propertiesError.message);
  }

  const propertyRows = properties ?? [];
  const propertyIds = propertyRows.map((property) => property.id);
  const [{ data: tenants, error: tenantsError }, { data: financials, error: financialsError }] =
    propertyIds.length > 0
      ? await Promise.all([
          supabase
            .from("property_tenants")
            .select("property_id, tenant_name, lease_end, monthly_rent")
            .in("property_id", propertyIds)
            .returns<PropertyTenant[]>(),
          supabase
            .from("property_financials")
            .select("property_id, mortgage, insurance, taxes, hoa, utilities, maintenance, cleaning, other_expenses, rent, late_fees, other_income")
            .in("property_id", propertyIds)
            .returns<PropertyFinancials[]>()
        ])
      : [
          { data: [] as PropertyTenant[], error: null },
          { data: [] as PropertyFinancials[], error: null }
        ];

  if (tenantsError) {
    throw new Error(tenantsError.message);
  }

  if (financialsError) {
    throw new Error(financialsError.message);
  }

  const tenantByProperty = new Map((tenants ?? []).map((tenant) => [tenant.property_id, tenant]));
  const financialsByProperty = new Map((financials ?? []).map((row) => [row.property_id, row]));
  const monthlyCashFlow = propertyRows.reduce((sum, property) => sum + getCashFlow(financialsByProperty.get(property.id)), 0);
  const occupiedCount = propertyRows.filter((property) => property.status === "occupied").length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-sage">{household.name}</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Houses</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink/65">
            Track each property, tenant, lease, expenses, income, maintenance, and documents in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">{propertyRows.length} properties</div>
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink/70">{occupiedCount} occupied</div>
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-income">
            {formatCurrency(monthlyCashFlow)}/mo
          </div>
        </div>
      </div>

      <section className="mb-5 rounded-lg border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add property</h2>
        <form action={addProperty} className="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_1fr_auto]">
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Address</span>
            <input
              required
              name="address"
              placeholder="123 Maple Street"
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Status</span>
            <select
              name="status"
              defaultValue="occupied"
              className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
            >
              <option value="occupied">Occupied</option>
              <option value="vacant">Vacant</option>
              <option value="maintenance">Maintenance</option>
              <option value="listed">Listed</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase text-ink/50">Notes</span>
            <input
              name="notes"
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

      {propertyRows.length === 0 ? (
        <section className="rounded-lg border border-dashed border-line bg-panel p-10 text-center">
          <Home className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-lg font-semibold text-ink">No properties yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink/60">
            Add the first address above, then open the card to fill in tenants, finances, maintenance, and documents.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {propertyRows.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              tenant={tenantByProperty.get(property.id)}
              financials={financialsByProperty.get(property.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  tenant,
  financials
}: {
  property: Property;
  tenant?: PropertyTenant;
  financials?: PropertyFinancials;
}) {
  const rent = Number(financials?.rent ?? tenant?.monthly_rent ?? 0);
  const mortgage = Number(financials?.mortgage ?? 0);
  const cashFlow = getCashFlow(financials);

  return (
    <Link
      href={`/home/${property.id}`}
      className="group block rounded-lg border border-line bg-panel p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            <h2 className="truncate text-lg font-semibold text-ink">{property.address}</h2>
          </div>
          {property.notes ? <p className="mt-2 line-clamp-2 text-sm text-ink/55">{property.notes}</p> : null}
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses[property.status]}`}>
          {statusLabels[property.status]} {property.status === "occupied" ? "✓" : ""}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PropertyMetric label="Tenant" value={tenant?.tenant_name || "Not added"} />
        <PropertyMetric label="Rent" value={formatCurrency(rent)} />
        <PropertyMetric label="Lease Ends" value={tenant?.lease_end ? formatDate(tenant.lease_end) : "Not added"} />
        <PropertyMetric label="Mortgage" value={formatCurrency(mortgage)} />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
        <div>
          <p className="text-xs font-medium uppercase text-ink/50">Cash Flow</p>
          <p className={cashFlow >= 0 ? "mt-1 text-xl font-semibold text-income" : "mt-1 text-xl font-semibold text-primary"}>
            {formatSignedCurrency(cashFlow)}/month
          </p>
        </div>
        <span className="text-sm font-medium text-ink/55 group-hover:text-primary">Open everything</span>
      </div>
    </Link>
  );
}

function PropertyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-2">
      <p className="text-xs font-medium uppercase text-ink/45">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function getCashFlow(financials?: PropertyFinancials) {
  if (!financials) {
    return 0;
  }

  const income = Number(financials.rent) + Number(financials.late_fees) + Number(financials.other_income);
  const expenses =
    Number(financials.mortgage) +
    Number(financials.insurance) +
    Number(financials.taxes) +
    Number(financials.hoa) +
    Number(financials.utilities) +
    Number(financials.maintenance) +
    Number(financials.cleaning) +
    Number(financials.other_expenses);

  return income - expenses;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
