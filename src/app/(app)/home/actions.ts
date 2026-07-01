"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";

const propertyStatuses = new Set(["occupied", "vacant", "maintenance", "listed"]);

export async function addProperty(formData: FormData) {
  const { supabase, user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const address = String(formData.get("address") ?? "").trim();

  if (!address) {
    return;
  }

  const statusValue = String(formData.get("status") ?? "occupied");
  const status = propertyStatuses.has(statusValue) ? statusValue : "occupied";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      household_id: household.id,
      address,
      status,
      notes
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
  redirect(`/home/${property.id}`);
}

export async function deleteProperty(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");

  if (!propertyId) {
    return;
  }

  const { error } = await supabase.from("properties").delete().eq("id", propertyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/home");
  redirect("/home");
}

export async function updatePropertyOverview(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const address = String(formData.get("address") ?? "").trim();

  if (!propertyId || !address) {
    return;
  }

  const statusValue = String(formData.get("status") ?? "occupied");
  const status = propertyStatuses.has(statusValue) ? statusValue : "occupied";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase
    .from("properties")
    .update({
      address,
      status,
      notes
    })
    .eq("id", propertyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function saveTenant(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");

  if (!propertyId) {
    return;
  }

  const { error } = await supabase.from("property_tenants").upsert(
    {
      property_id: propertyId,
      tenant_name: textOrNull(formData, "tenant_name"),
      phone: textOrNull(formData, "phone"),
      email: textOrNull(formData, "email"),
      emergency_contact: textOrNull(formData, "emergency_contact"),
      lease_start: textOrNull(formData, "lease_start"),
      lease_end: textOrNull(formData, "lease_end"),
      monthly_rent: numberOrZero(formData, "monthly_rent"),
      security_deposit: numberOrZero(formData, "security_deposit"),
      pets: textOrNull(formData, "pets"),
      updated_at: new Date().toISOString()
    },
    { onConflict: "property_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function savePropertyFinancials(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");

  if (!propertyId) {
    return;
  }

  const { error } = await supabase.from("property_financials").upsert(
    {
      property_id: propertyId,
      mortgage: numberOrZero(formData, "mortgage"),
      insurance: numberOrZero(formData, "insurance"),
      taxes: numberOrZero(formData, "taxes"),
      hoa: numberOrZero(formData, "hoa"),
      utilities: numberOrZero(formData, "utilities"),
      maintenance: numberOrZero(formData, "maintenance"),
      cleaning: numberOrZero(formData, "cleaning"),
      other_expenses: numberOrZero(formData, "other_expenses"),
      rent: numberOrZero(formData, "rent"),
      late_fees: numberOrZero(formData, "late_fees"),
      other_income: numberOrZero(formData, "other_income"),
      updated_at: new Date().toISOString()
    },
    { onConflict: "property_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function addPropertyMaintenanceItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!propertyId || !title) {
    return;
  }

  const { error } = await supabase.from("property_maintenance_items").insert({
    property_id: propertyId,
    title,
    due_date: textOrNull(formData, "due_date"),
    notes: textOrNull(formData, "notes"),
    status: "open"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function togglePropertyMaintenanceItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status")) === "done" ? "done" : "open";

  if (!propertyId || !id) {
    return;
  }

  const { error } = await supabase.from("property_maintenance_items").update({ status }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function deletePropertyMaintenanceItem(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const id = String(formData.get("id") ?? "");

  if (!propertyId || !id) {
    return;
  }

  const { error } = await supabase.from("property_maintenance_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function addPropertyDocument(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const documentType = String(formData.get("document_type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!propertyId || !documentType || !title) {
    return;
  }

  const { error } = await supabase.from("property_documents").insert({
    property_id: propertyId,
    document_type: documentType,
    title,
    file_url: textOrNull(formData, "file_url"),
    notes: textOrNull(formData, "notes")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

export async function deletePropertyDocument(formData: FormData) {
  const { supabase } = await getCurrentUser();
  const propertyId = String(formData.get("property_id") ?? "");
  const id = String(formData.get("id") ?? "");

  if (!propertyId || !id) {
    return;
  }

  const { error } = await supabase.from("property_documents").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateProperty(propertyId);
}

function textOrNull(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

function numberOrZero(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function revalidateProperty(propertyId: string) {
  revalidatePath("/home");
  revalidatePath(`/home/${propertyId}`);
}
