"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";
import { logActivity } from "../data-actions";
import { customOrgId } from "./lib";

function toDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v || "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
function refresh() {
  revalidatePath("/custom-trips", "layout");
}
// Confirm a custom trip belongs to the current (module-enabled) org.
async function own(orgId: string, id: string) {
  return !!(await prisma.customTrip.findFirst({ where: { id, orgId }, select: { id: true } }));
}

export async function createCustomTrip(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const clientName = String(formData.get("clientName") || "").trim();
  const title = String(formData.get("title") || "").trim() || "Custom trip";
  if (!clientName) return;

  // Link to an existing customer by name if there is one (same directory as trips).
  const match = await prisma.customer.findFirst({ where: { orgId, name: { equals: clientName, mode: "insensitive" } }, select: { id: true, phone: true } });

  const ct = await prisma.customTrip.create({
    data: {
      orgId,
      clientName,
      clientPhone: match?.phone || String(formData.get("clientPhone") || "").trim() || null,
      customerId: match?.id || null,
      title,
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
    },
  });
  await logActivity(orgId, "custom", "added", `New custom trip “${title}” for ${clientName}`, `/custom-trips/${ct.id}`);
  refresh();
  redirect(`/custom-trips/${ct.id}`);
}

export async function updateCustomTrip(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const id = String(formData.get("id"));
  if (!(await own(orgId, id))) return;
  await prisma.customTrip.update({
    where: { id },
    data: {
      title: String(formData.get("title") || "").trim() || "Custom trip",
      clientName: String(formData.get("clientName") || "").trim() || "Client",
      clientPhone: String(formData.get("clientPhone") || "").trim() || null,
      status: String(formData.get("status") || "enquiry"),
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      discount: parseAmount(String(formData.get("discount"))),
      gstRate: parseInt(String(formData.get("gstRate") || "5")) || 0,
      tcsRate: parseInt(String(formData.get("tcsRate") || "2")) || 0,
      notes: String(formData.get("notes") || "").trim() || null,
    },
  });
  refresh();
}

export async function deleteCustomTrip(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const id = String(formData.get("id"));
  if (!(await own(orgId, id))) return;
  const ct = await prisma.customTrip.findUnique({ where: { id }, select: { title: true, clientName: true } });
  await prisma.customTrip.delete({ where: { id } });
  await logActivity(orgId, "custom", "deleted", `Deleted custom trip “${ct?.title}” for ${ct?.clientName}`);
  refresh();
  redirect("/custom-trips");
}

export async function addItem(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const customTripId = String(formData.get("customTripId"));
  if (!(await own(orgId, customTripId))) return;
  const description = String(formData.get("description") || "").trim();
  if (!description) return;
  await prisma.customItem.create({
    data: {
      customTripId,
      type: String(formData.get("type") || "other"),
      description,
      supplier: String(formData.get("supplier") || "").trim() || null,
      date: toDate(formData.get("date")),
      qty: parseInt(String(formData.get("qty") || "1")) || 1,
      cost: parseAmount(String(formData.get("cost"))),
      sell: parseAmount(String(formData.get("sell"))),
      taxable: String(formData.get("taxable")) === "yes",
    },
  });
  refresh();
}

export async function updateItem(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const id = String(formData.get("id"));
  const item = await prisma.customItem.findFirst({ where: { id, trip: { orgId } }, select: { id: true } });
  if (!item) return;
  await prisma.customItem.update({
    where: { id },
    data: {
      type: String(formData.get("type") || "other"),
      description: String(formData.get("description") || "").trim() || "Item",
      supplier: String(formData.get("supplier") || "").trim() || null,
      date: toDate(formData.get("date")),
      qty: parseInt(String(formData.get("qty") || "1")) || 1,
      cost: parseAmount(String(formData.get("cost"))),
      sell: parseAmount(String(formData.get("sell"))),
      taxable: String(formData.get("taxable")) === "yes",
    },
  });
  refresh();
}

export async function deleteItem(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  await prisma.customItem.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
  refresh();
}

export async function addPayment(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  const customTripId = String(formData.get("customTripId"));
  if (!(await own(orgId, customTripId))) return;
  const amount = parseAmount(String(formData.get("amount")));
  if (amount <= 0) return;
  await prisma.customPayment.create({
    data: { customTripId, amount, mode: String(formData.get("mode") || "upi"), date: toDate(formData.get("date")) || new Date(), note: String(formData.get("note") || "").trim() || null },
  });
  refresh();
}

export async function deletePayment(formData: FormData) {
  const orgId = await customOrgId();
  if (!orgId) return;
  await prisma.customPayment.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
  refresh();
}
