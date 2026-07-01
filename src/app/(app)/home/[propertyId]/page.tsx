import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/households";
import {
  addPropertyDocument,
  addPropertyMaintenanceItem,
  deleteProperty,
  deletePropertyDocument,
  deletePropertyMaintenanceItem,
  savePropertyFinancials,
  saveTenant,
  togglePropertyMaintenanceItem,
  updatePropertyOverview
} from "../actions";

type Property = {
  id: string;
  address: string;
  status: "occupied" | "vacant" | "maintenance" | "listed";
  notes: string | null;
  created_at: string;
};

type PropertyTenant = {
  tenant_name: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  lease_start: string | null;
  lease_end: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  pets: string | null;
};

type PropertyFinancials = {
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

type PropertyMaintenanceItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: "open" | "done" | "archived";
  notes: string | null;
  created_at: string;
};

type PropertyDocument = {
  id: string;
  document_type: string;
  title: string;
  file_url: string | null;
  notes: string | null;
  created_at: string;
};

type PropertyPageProps = {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const tabs = [
  { id: "overview", label: "Property Overview" },
  { id: "tenant", label: "Tenant" },
  { id: "expenses", label: "Expenses" },
  { id: "income", label: "Income" },
  { id: "maintenance", label: "Maintenance" },
  { id: "documents", label: "Documents" }
];

const documentTypes = ["Lease", "Purchase Agreement", "Inspection", "Insurance", "Mortgage", "Tax Bill", "Photos", "Receipts", "Invoices"];

const blankFinancials: PropertyFinancials = {
  mortgage: 0,
  insurance: 0,
  taxes: 0,
  hoa: 0,
  utilities: 0,
  maintenance: 0,
  cleaning: 0,
  other_expenses: 0,
  rent: 0,
  late_fees: 0,
  other_income: 0
};

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const [{ propertyId }, query] = await Promise.all([params, searchParams]);
  const activeTab = tabs.some((tab) => tab.id === query.tab) ? query.tab ?? "overview" : "overview";
  const { supabase } = await getCurrentUser();

  const [
    { data: property, error: propertyError },
    { data: tenant, error: tenantError },
    { data: financialsRow, error: financialsError },
    { data: maintenanceItems, error: maintenanceError },
    { data: documents, error: documentsError }
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id, address, status, notes, created_at")
      .eq("id", propertyId)
      .maybeSingle<Property>(),
    supabase
      .from("property_tenants")
      .select("tenant_name, phone, email, emergency_contact, lease_start, lease_end, monthly_rent, security_deposit, pets")
      .eq("property_id", propertyId)
      .maybeSingle<PropertyTenant>(),
    supabase
      .from("property_financials")
      .select("mortgage, insurance, taxes, hoa, utilities, maintenance, cleaning, other_expenses, rent, late_fees, other_income")
      .eq("property_id", propertyId)
      .maybeSingle<PropertyFinancials>(),
    supabase
      .from("property_maintenance_items")
      .select("id, title, due_date, status, notes, created_at")
      .eq("property_id", propertyId)
      .neq("status", "archived")
      .order("status", { ascending: false })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .returns<PropertyMaintenanceItem[]>(),
    supabase
      .from("property_documents")
      .select("id, document_type, title, file_url, notes, created_at")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .returns<PropertyDocument[]>()
  ]);

  if (propertyError) {
    throw new Error(propertyError.message);
  }

  if (!property) {
    notFound();
  }

  if (tenantError) {
    throw new Error(tenantError.message);
  }

  if (financialsError) {
    throw new Error(financialsError.message);
  }

  if (maintenanceError) {
    throw new Error(maintenanceError.message);
  }

  if (documentsError) {
    throw new Error(documentsError.message);
  }

  const financials = financialsRow ?? blankFinancials;
  const monthlyIncome = getMonthlyIncome(financials);
  const monthlyExpenses = getMonthlyExpenses(financials);
  const monthlyCashFlow = monthlyIncome - monthlyExpenses;
  const annualCashFlow = monthlyCashFlow * 12;
  const openMaintenance = (maintenanceItems ?? []).filter((item) => item.status === "open");
  const completedMaintenance = (maintenanceItems ?? []).filter((item) => item.status === "done");

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <Link href="/home" className="inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Houses
        </Link>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-sage">Property</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">{property.address}</h1>
            <p className="mt-2 text-sm text-ink/65">
              {tenant?.tenant_name ? `${tenant.tenant_name} currently linked` : "Add tenant and financial details to complete this property."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SummaryPill label="Monthly Cash Flow" value={`${formatSignedCurrency(monthlyCashFlow)}/mo`} tone={monthlyCashFlow >= 0 ? "income" : "expense"} />
            <SummaryPill label="Annual Cash Flow" value={`${formatSignedCurrency(annualCashFlow)}/yr`} tone={annualCashFlow >= 0 ? "income" : "expense"} />
          </div>
        </div>
      </div>

      <nav className="mb-5 flex gap-2 overflow-x-auto border-b border-line pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/home/${property.id}${tab.id === "overview" ? "" : `?tab=${tab.id}`}`}
            className={
              activeTab === tab.id
                ? "shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-paper"
                : "shrink-0 rounded-md px-3 py-2 text-sm font-medium text-ink/65 hover:bg-panel hover:text-ink"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <OverviewTab property={property} tenant={tenant} financials={financials} monthlyExpenses={monthlyExpenses} monthlyIncome={monthlyIncome} monthlyCashFlow={monthlyCashFlow} />
      ) : null}
      {activeTab === "tenant" ? <TenantTab propertyId={property.id} tenant={tenant} /> : null}
      {activeTab === "expenses" ? <ExpensesTab propertyId={property.id} financials={financials} monthlyExpenses={monthlyExpenses} /> : null}
      {activeTab === "income" ? <IncomeTab propertyId={property.id} financials={financials} monthlyIncome={monthlyIncome} monthlyCashFlow={monthlyCashFlow} annualCashFlow={annualCashFlow} /> : null}
      {activeTab === "maintenance" ? (
        <MaintenanceTab propertyId={property.id} openItems={openMaintenance} completedItems={completedMaintenance} />
      ) : null}
      {activeTab === "documents" ? <DocumentsTab propertyId={property.id} documents={documents ?? []} /> : null}
    </div>
  );
}

function OverviewTab({
  property,
  tenant,
  financials,
  monthlyExpenses,
  monthlyIncome,
  monthlyCashFlow
}: {
  property: Property;
  tenant: PropertyTenant | null;
  financials: PropertyFinancials;
  monthlyExpenses: number;
  monthlyIncome: number;
  monthlyCashFlow: number;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Property Overview</h2>
        <form action={updatePropertyOverview} className="space-y-3">
          <input type="hidden" name="property_id" value={property.id} />
          <TextField required name="address" label="Address" defaultValue={property.address} />
          <SelectField
            name="status"
            label="Status"
            defaultValue={property.status}
            options={[
              ["occupied", "Occupied"],
              ["vacant", "Vacant"],
              ["maintenance", "Maintenance"],
              ["listed", "Listed"]
            ]}
          />
          <TextArea name="notes" label="Notes" defaultValue={property.notes ?? ""} />
          <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">Save overview</button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Snapshot</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Tenant" value={tenant?.tenant_name || "Not added"} />
          <Metric label="Lease Ends" value={tenant?.lease_end ? formatDate(tenant.lease_end) : "Not added"} />
          <Metric label="Monthly Income" value={formatCurrency(monthlyIncome)} tone="income" />
          <Metric label="Monthly Expenses" value={formatCurrency(monthlyExpenses)} />
          <Metric label="Monthly Cash Flow" value={formatSignedCurrency(monthlyCashFlow)} tone={monthlyCashFlow >= 0 ? "income" : "expense"} />
          <Metric label="Mortgage" value={formatCurrency(Number(financials.mortgage))} />
        </div>
        <form action={deleteProperty} className="mt-5 border-t border-line pt-4">
          <input type="hidden" name="property_id" value={property.id} />
          <button className="inline-flex h-10 items-center gap-2 rounded-md border border-primary/40 px-4 text-sm font-semibold text-primary hover:bg-primary/10">
            <Trash2 className="h-4 w-4" />
            Delete property
          </button>
        </form>
      </section>
    </div>
  );
}

function TenantTab({ propertyId, tenant }: { propertyId: string; tenant: PropertyTenant | null }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-ink">Tenant</h2>
      <form action={saveTenant} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="property_id" value={propertyId} />
        <TextField name="tenant_name" label="Tenant Name" defaultValue={tenant?.tenant_name ?? ""} />
        <TextField name="phone" label="Phone" defaultValue={tenant?.phone ?? ""} />
        <TextField name="email" label="Email" defaultValue={tenant?.email ?? ""} type="email" />
        <TextField name="emergency_contact" label="Emergency Contact" defaultValue={tenant?.emergency_contact ?? ""} />
        <DateField name="lease_start" label="Lease Start" defaultValue={tenant?.lease_start ?? ""} />
        <DateField name="lease_end" label="Lease End" defaultValue={tenant?.lease_end ?? ""} />
        <MoneyField name="monthly_rent" label="Monthly Rent" defaultValue={tenant?.monthly_rent ?? 0} />
        <MoneyField name="security_deposit" label="Security Deposit" defaultValue={tenant?.security_deposit ?? 0} />
        <div className="sm:col-span-2">
          <TextArea name="pets" label="Pets" defaultValue={tenant?.pets ?? ""} />
        </div>
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 sm:col-span-2">
          Save tenant
        </button>
      </form>
    </section>
  );
}

function ExpensesTab({ propertyId, financials, monthlyExpenses }: { propertyId: string; financials: PropertyFinancials; monthlyExpenses: number }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold text-ink">Expenses</h2>
        <SummaryPill label="Monthly Total" value={formatCurrency(monthlyExpenses)} />
      </div>
      <form action={savePropertyFinancials} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="property_id" value={propertyId} />
        <HiddenFinancials financials={financials} include="income" />
        <MoneyField name="mortgage" label="Mortgage" defaultValue={financials.mortgage} />
        <MoneyField name="insurance" label="Insurance" defaultValue={financials.insurance} />
        <MoneyField name="taxes" label="Taxes" defaultValue={financials.taxes} />
        <MoneyField name="hoa" label="HOA" defaultValue={financials.hoa} />
        <MoneyField name="utilities" label="Utilities" defaultValue={financials.utilities} />
        <MoneyField name="maintenance" label="Maintenance" defaultValue={financials.maintenance} />
        <MoneyField name="cleaning" label="Cleaning" defaultValue={financials.cleaning} />
        <MoneyField name="other_expenses" label="Other" defaultValue={financials.other_expenses} />
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 sm:col-span-2 lg:col-span-4">
          Save expenses
        </button>
      </form>
    </section>
  );
}

function IncomeTab({
  propertyId,
  financials,
  monthlyIncome,
  monthlyCashFlow,
  annualCashFlow
}: {
  propertyId: string;
  financials: PropertyFinancials;
  monthlyIncome: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Monthly Income" value={formatCurrency(monthlyIncome)} tone="income" />
        <Metric label="Monthly Cash Flow" value={formatSignedCurrency(monthlyCashFlow)} tone={monthlyCashFlow >= 0 ? "income" : "expense"} />
        <Metric label="Annual Cash Flow" value={formatSignedCurrency(annualCashFlow)} tone={annualCashFlow >= 0 ? "income" : "expense"} />
      </div>
      <form action={savePropertyFinancials} className="grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="property_id" value={propertyId} />
        <HiddenFinancials financials={financials} include="expenses" />
        <MoneyField name="rent" label="Rent" defaultValue={financials.rent} />
        <MoneyField name="late_fees" label="Late Fees" defaultValue={financials.late_fees} />
        <MoneyField name="other_income" label="Other Income" defaultValue={financials.other_income} />
        <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90 sm:col-span-3">
          Save income
        </button>
      </form>
    </section>
  );
}

function MaintenanceTab({
  propertyId,
  openItems,
  completedItems
}: {
  propertyId: string;
  openItems: PropertyMaintenanceItem[];
  completedItems: PropertyMaintenanceItem[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add Maintenance</h2>
        <form action={addPropertyMaintenanceItem} className="space-y-3">
          <input type="hidden" name="property_id" value={propertyId} />
          <TextField required name="title" label="Item" placeholder="Replace HVAC filter" />
          <DateField name="due_date" label="Due Date" />
          <TextArea name="notes" label="Notes" />
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </form>
      </section>
      <section className="space-y-4">
        <MaintenanceList propertyId={propertyId} title="Open Maintenance" items={openItems} />
        <MaintenanceList propertyId={propertyId} title="Completed" items={completedItems} doneList />
      </section>
    </div>
  );
}

function DocumentsTab({ propertyId, documents }: { propertyId: string; documents: PropertyDocument[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Documents</h2>
        <form action={addPropertyDocument} className="space-y-3">
          <input type="hidden" name="property_id" value={propertyId} />
          <SelectField
            name="document_type"
            label="Type"
            defaultValue=""
            options={documentTypes.map((type) => [type, type])}
          />
          <TextField required name="title" label="Title" placeholder="Signed lease" />
          <TextField name="file_url" label="Upload / File Link" placeholder="https://..." />
          <TextArea name="notes" label="Notes" />
          <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-paper hover:bg-primary/90">
            <Plus className="h-4 w-4" />
            Save document
          </button>
        </form>
      </section>
      <section className="rounded-lg border border-line bg-panel p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Saved Documents</h2>
          <span className="text-sm text-ink/55">{documents.length}</span>
        </div>
        {documents.length === 0 ? (
          <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-ink/60">
            Store leases, mortgage docs, tax bills, photos, receipts, and invoices here.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => (
              <div key={document.id} className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate text-sm font-semibold text-ink">{document.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{document.document_type}</p>
                  {document.notes ? <p className="mt-2 text-sm text-ink/65">{document.notes}</p> : null}
                  {document.file_url ? (
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-income hover:text-income/80"
                    >
                      Open file
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
                <form action={deletePropertyDocument}>
                  <input type="hidden" name="property_id" value={propertyId} />
                  <input type="hidden" name="id" value={document.id} />
                  <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-primary" aria-label={`Delete ${document.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MaintenanceList({
  propertyId,
  title,
  items,
  doneList = false
}: {
  propertyId: string;
  title: string;
  items: PropertyMaintenanceItem[];
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
          {doneList ? "Completed maintenance will show here." : "No property maintenance yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-line px-3 py-3">
              <form action={togglePropertyMaintenanceItem} className="flex min-w-0 flex-1 items-start gap-3">
                <input type="hidden" name="property_id" value={propertyId} />
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
                    <p className={item.status === "done" ? "text-sm font-semibold text-ink/45 line-through" : "text-sm font-semibold text-ink"}>
                      {item.title}
                    </p>
                    {item.status === "done" ? <CheckCircle2 className="h-4 w-4 text-income" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-ink/50">{item.due_date ? `Due ${formatDate(item.due_date)}` : "No due date"}</p>
                  {item.notes ? <p className="mt-2 text-sm text-ink/65">{item.notes}</p> : null}
                </div>
              </form>
              <form action={deletePropertyMaintenanceItem}>
                <input type="hidden" name="property_id" value={propertyId} />
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded-md p-2 text-ink/45 hover:bg-paper hover:text-primary" aria-label={`Delete ${item.title}`}>
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

function TextField({
  name,
  label,
  placeholder,
  defaultValue = "",
  required = false,
  type = "text"
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function MoneyField({ name, label, defaultValue = 0 }: { name: string; label: string; defaultValue?: number | null }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        name={name}
        min="0"
        step="0.01"
        type="number"
        defaultValue={Number(defaultValue ?? 0)}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function DateField({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <input
        name={name}
        type="date"
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function TextArea({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-sage"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[][];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase text-ink/50">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-sage"
      >
        <option value="">Select</option>
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function HiddenFinancials({ financials, include }: { financials: PropertyFinancials; include: "income" | "expenses" }) {
  const names =
    include === "income"
      ? ["rent", "late_fees", "other_income"]
      : ["mortgage", "insurance", "taxes", "hoa", "utilities", "maintenance", "cleaning", "other_expenses"];

  return (
    <>
      {names.map((name) => (
        <input key={name} type="hidden" name={name} value={String(financials[name as keyof PropertyFinancials])} />
      ))}
    </>
  );
}

function SummaryPill({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "income" | "expense" }) {
  const valueClass = tone === "income" ? "text-income" : tone === "expense" ? "text-primary" : "text-ink";

  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2">
      <p className="text-xs font-medium uppercase text-ink/45">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "income" | "expense" }) {
  const valueClass = tone === "income" ? "text-income" : tone === "expense" ? "text-primary" : "text-ink";

  return (
    <div className="rounded-md border border-line bg-paper px-3 py-3">
      <p className="text-xs font-medium uppercase text-ink/45">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function getMonthlyIncome(financials: PropertyFinancials) {
  return Number(financials.rent) + Number(financials.late_fees) + Number(financials.other_income);
}

function getMonthlyExpenses(financials: PropertyFinancials) {
  return (
    Number(financials.mortgage) +
    Number(financials.insurance) +
    Number(financials.taxes) +
    Number(financials.hoa) +
    Number(financials.utilities) +
    Number(financials.maintenance) +
    Number(financials.cleaning) +
    Number(financials.other_expenses)
  );
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
