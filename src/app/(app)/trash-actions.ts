"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { logActivity } from "./data-actions";

type Kind = "trip" | "booking" | "customer" | "expense" | "customTrip";

async function currentOrg(): Promise<string> {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) redirect("/login");
  return ctx.orgId;
}
function refresh() {
  revalidatePath("/", "layout");
}

// Bring a soft-deleted record back. A trip also restores the bookings + expenses
// that were removed together with it (matched by the shared deletedAt stamp).
export async function restoreItem(formData: FormData) {
  const org = await currentOrg();
  const kind = String(formData.get("kind")) as Kind;
  const id = String(formData.get("id"));

  if (kind === "trip") {
    const t = await prisma.trip.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { deletedAt: true, name: true } });
    if (!t?.deletedAt) { refresh(); return; }
    await prisma.trip.update({ where: { id }, data: { deletedAt: null } });
    await prisma.booking.updateMany({ where: { tripId: id, deletedAt: t.deletedAt }, data: { deletedAt: null } });
    await prisma.expense.updateMany({ where: { tripId: id, deletedAt: t.deletedAt }, data: { deletedAt: null } });
    await logActivity(org, "trip", "restored", `Restored trip “${t.name}”`);
  } else if (kind === "booking") {
    const b = await prisma.booking.findFirst({ where: { id, trip: { orgId: org }, deletedAt: { not: null } }, select: { customerName: true } });
    if (!b) { refresh(); return; }
    await prisma.booking.update({ where: { id }, data: { deletedAt: null } });
    await logActivity(org, "booking", "restored", `Restored booking — ${b.customerName}`);
  } else if (kind === "customer") {
    const c = await prisma.customer.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { name: true } });
    if (!c) { refresh(); return; }
    await prisma.customer.update({ where: { id }, data: { deletedAt: null } });
    await logActivity(org, "customer", "restored", `Restored customer ${c.name}`);
  } else if (kind === "expense") {
    const e = await prisma.expense.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { payee: true } });
    if (!e) { refresh(); return; }
    await prisma.expense.update({ where: { id }, data: { deletedAt: null } });
    await logActivity(org, "expense", "restored", `Restored a spend${e.payee ? " to " + e.payee : ""}`);
  } else if (kind === "customTrip") {
    const ct = await prisma.customTrip.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { title: true } });
    if (!ct) { refresh(); return; }
    await prisma.customTrip.update({ where: { id }, data: { deletedAt: null } });
    await logActivity(org, "custom", "restored", `Restored custom trip “${ct.title}”`);
  }
  refresh();
}

// Permanently remove a record from the bin. The only true delete in the app —
// user-initiated and confirmed. A trip's children go with it (DB cascade).
export async function purgeItem(formData: FormData) {
  const org = await currentOrg();
  const kind = String(formData.get("kind")) as Kind;
  const id = String(formData.get("id"));

  if (kind === "trip") {
    const t = await prisma.trip.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { name: true } });
    if (!t) { refresh(); return; }
    await prisma.trip.delete({ where: { id } });
    await logActivity(org, "trip", "purged", `Permanently deleted trip “${t.name}”`);
  } else if (kind === "booking") {
    const b = await prisma.booking.findFirst({ where: { id, trip: { orgId: org }, deletedAt: { not: null } }, select: { customerName: true } });
    if (!b) { refresh(); return; }
    await prisma.booking.delete({ where: { id } });
    await logActivity(org, "booking", "purged", `Permanently deleted booking — ${b.customerName}`);
  } else if (kind === "customer") {
    const c = await prisma.customer.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { name: true } });
    if (!c) { refresh(); return; }
    await prisma.booking.updateMany({ where: { customerId: id }, data: { customerId: null } });
    await prisma.customer.delete({ where: { id } });
    await logActivity(org, "customer", "purged", `Permanently deleted customer ${c.name}`);
  } else if (kind === "expense") {
    const e = await prisma.expense.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { id: true } });
    if (!e) { refresh(); return; }
    await prisma.expense.delete({ where: { id } });
    await logActivity(org, "expense", "purged", `Permanently deleted a spend`);
  } else if (kind === "customTrip") {
    const ct = await prisma.customTrip.findFirst({ where: { id, orgId: org, deletedAt: { not: null } }, select: { title: true } });
    if (!ct) { refresh(); return; }
    await prisma.customTrip.delete({ where: { id } });
    await logActivity(org, "custom", "purged", `Permanently deleted custom trip “${ct.title}”`);
  }
  refresh();
}
