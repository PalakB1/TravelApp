"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getScope, canUseTrip, type Scope } from "@/lib/scope";
import { parseAmount } from "@/lib/money";
import { apportion } from "@/lib/schedule";
import { logActivity } from "../data-actions";
import { orgMoney } from "@/lib/orgMoney";
import { toDay, todayDay } from "@/lib/dates";

const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

// Invoice upload cap. Base64 in Postgres is fine at this size; can move to blob
// storage later if the ledger grows large.
const MAX_FILE = 5_000_000;

// Log a spend — optionally tagged to a trip, optionally with an uploaded invoice.
export async function addExpense(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");

  const amount = parseAmount(String(formData.get("amount") || ""));
  if (!amount || amount <= 0) { revalidatePath("/expenses"); return; }

  // Where to assign the spend. `target` is one of:
  //   ""              → general / overhead
  //   "trip:<id>"     → the whole trip
  //   "hotel:<id>"    → a specific hotel booking (tripId derived from it)
  //   "car:<id>"      → a specific car (tripId derived from it)
  // Everything is re-validated against this org + the member's trip scope, so a
  // stale or forged id just falls back to a general spend.
  //   ""              → general / overhead
  //   "trip:<id>"     → the whole trip
  //   "hotel:<id>" …  → one specific item
  // The full form instead posts `tripId` plus any number of `items`, because one
  // supplier bill often covers several nights or a car and its driver at once.
  const target = String(formData.get("target") || "");
  let tripId: string | null = null;
  let hotelId: string | null = null;
  let carId: string | null = null;

  const refs = formData.getAll("items").map((v) => String(v)).filter(Boolean);
  const picked = (await Promise.all(refs.map((r) => resolvePaidTarget(scope, r)))).filter(
    (x): x is NonNullable<typeof x> => x !== null,
  );

  if (picked.length > 0) {
    tripId = picked[0].tripId; // the picker only ever offers one trip's items
    if (picked.length === 1) {
      // Keep the legacy single-link columns meaningful for one-item spends.
      hotelId = picked[0].kind === "hotel" ? picked[0].id : null;
      carId = picked[0].kind === "car" ? picked[0].id : null;
    }
  } else if (target.startsWith("hotel:")) {
    const id = target.slice(6);
    const h = await prisma.hotelBooking.findFirst({ where: { id, night: { trip: scope.tripWhere } }, select: { night: { select: { tripId: true } } } });
    if (h) { hotelId = id; tripId = h.night.tripId; }
  } else if (target.startsWith("car:")) {
    const id = target.slice(4);
    const c = await prisma.car.findFirst({ where: { id, trip: scope.tripWhere }, select: { tripId: true } });
    if (c) { carId = id; tripId = c.tripId; }
  } else if (target.startsWith("trip:")) {
    const id = target.slice(5);
    if (await canUseTrip(scope, id)) tripId = id;
  }

  // No items ticked, but a trip chosen — the spend belongs to the trip as a whole.
  if (!tripId) {
    const plainTrip = String(formData.get("tripId") || "");
    if (plainTrip && (await canUseTrip(scope, plainTrip))) tripId = plainTrip;
  }

  // Each tagged item takes a share of the bill, weighted by what it was
  // estimated to cost, so per-item reconciliation stays honest.
  const shares = apportion(amount, picked.map((t) => t.estimate));

  // Optional invoice/receipt file → base64 data URL.
  let fileName: string | null = null;
  let fileType: string | null = null;
  let fileData: string | null = null;
  const file = formData.get("file");
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    const f = file as File;
    if (f.size <= MAX_FILE) {
      const buf = Buffer.from(await f.arrayBuffer());
      fileType = f.type || "application/octet-stream";
      fileName = f.name || "invoice";
      fileData = `data:${fileType};base64,${buf.toString("base64")}`;
    }
  }

  const dateStr = str(formData.get("date"));

  const paidPersonally = String(formData.get("paidPersonally") || "") === "on";

  const expense = await prisma.expense.create({
    data: {
      orgId: scope.orgId,
      tripId,
      hotelId,
      carId,
      date: toDay(dateStr) ?? todayDay(),
      category: str(formData.get("category")) || "misc",
      payee: str(formData.get("payee")),
      amount,
      status: str(formData.get("status")) || "paid",
      paymentMode: str(formData.get("paymentMode")),
      bankName: str(formData.get("bankName")),
      paidPersonally,
      // Only meaningful for personal spends — who fronted the money.
      paidBy: paidPersonally ? str(formData.get("paidBy")) : null,
      notes: str(formData.get("notes")),
      fileName,
      fileType,
      fileData,
      items: picked.length > 0 ? {
        create: picked.map((t, idx) => ({
          hotelId: t.kind === "hotel" ? t.id : null,
          carId: t.kind === "car" ? t.id : null,
          vendorId: t.kind === "vendor" ? t.id : null,
          amount: shares[idx] ?? 0,
        })),
      } : undefined,
    },
    include: { trip: { select: { name: true } }, hotel: { select: { hotelName: true } }, car: { select: { label: true } } },
  });

  const targetLabel = picked.length > 1
    ? `${expense.trip?.name ?? "trip"} › ${picked.length} items`
    : picked.length === 1
      ? `${expense.trip?.name ?? "trip"} › ${picked[0].label}`
      : expense.hotel ? `${expense.trip?.name ?? "trip"} › ${expense.hotel.hotelName}`
        : expense.car ? `${expense.trip?.name ?? "trip"} › ${expense.car.label}`
          : expense.trip ? expense.trip.name : "general";
  await logActivity(
    scope.orgId,
    "expense",
    "create",
    `Added ${(await orgMoney()).fmt(amount)} spend${expense.payee ? " to " + expense.payee : ""} · ${targetLabel}`,
    "/expenses",
  );
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
}

export async function deleteExpense(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));

  // Only within this org, and — for trip-scoped members — only their trips' rows.
  const where = scope.tripIds
    ? { id, orgId: scope.orgId, tripId: { in: scope.tripIds } }
    : { id, orgId: scope.orgId };
  const exp = await prisma.expense.findFirst({ where, select: { id: true, amount: true, payee: true } });
  if (!exp) { revalidatePath("/expenses"); return; }

  await prisma.expense.update({ where: { id: exp.id }, data: { deletedAt: new Date() } });
  await logActivity(scope.orgId, "expense", "delete", `Removed ${(await orgMoney()).fmt(exp.amount)} spend${exp.payee ? " to " + exp.payee : ""} (recoverable)`, "/expenses");
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
}

// Reimburse one or more personal spends in a single company transfer. The chosen
// expenses get stamped with the settlement (its bank + transaction reference), so
// the ledger shows they've been paid back and how.
export async function settleExpenses(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");

  const ids = formData.getAll("ids").map((v) => String(v)).filter(Boolean);
  if (ids.length === 0) { revalidatePath("/expenses"); return; }

  // Re-validate: only this org's rows, personal, not already settled, not deleted,
  // and (for trip-scoped members) within their trips.
  const where = scope.tripIds
    ? { id: { in: ids }, orgId: scope.orgId, paidPersonally: true, settlementId: null, deletedAt: null, OR: [{ tripId: { in: scope.tripIds } }, { tripId: null }] }
    : { id: { in: ids }, orgId: scope.orgId, paidPersonally: true, settlementId: null, deletedAt: null };
  const rows = await prisma.expense.findMany({ where, select: { id: true, amount: true } });
  if (rows.length === 0) { revalidatePath("/expenses"); return; }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const dateStr = str(formData.get("date"));

  const settlement = await prisma.settlement.create({
    data: {
      orgId: scope.orgId,
      date: toDay(dateStr) ?? todayDay(),
      reference: str(formData.get("reference")),
      bankName: str(formData.get("bankName")),
      paidTo: str(formData.get("paidTo")),
      notes: str(formData.get("notes")),
      amount: total,
      expenses: { connect: rows.map((r) => ({ id: r.id })) },
    },
  });

  await logActivity(
    scope.orgId,
    "expense",
    "settle",
    `Reimbursed ${(await orgMoney()).fmt(total)} across ${rows.length} personal spend${rows.length === 1 ? "" : "s"}${settlement.paidTo ? " to " + settlement.paidTo : ""}${settlement.reference ? " · ref " + settlement.reference : ""}`,
    "/expenses",
  );
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
}

// Reverse a settlement: unlink its expenses (they become owed again) and delete
// the settlement record. Used to fix a mistaken reimbursement.
export async function undoSettlement(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");
  const id = String(formData.get("id"));

  const settlement = await prisma.settlement.findFirst({
    where: { id, orgId: scope.orgId },
    select: { id: true, amount: true, _count: { select: { expenses: true } } },
  });
  if (!settlement) { revalidatePath("/expenses"); return; }

  await prisma.expense.updateMany({ where: { settlementId: id, orgId: scope.orgId }, data: { settlementId: null } });
  await prisma.settlement.delete({ where: { id } });
  await logActivity(scope.orgId, "expense", "settle", `Reversed a ${(await orgMoney()).fmt(settlement.amount)} reimbursement (${settlement._count.expenses} spend${settlement._count.expenses === 1 ? "" : "s"} owed again)`, "/expenses");
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
}

// --- Marking a booked item as paid -----------------------------------------
// Hotels, cars and vendor bookings carry an *estimate* — what you expect the
// thing to cost. Money actually leaving the bank belongs in the Costing ledger.
// Before this, marking something paid and then logging the spend were two
// separate jobs, and the second one got skipped.
//
// Now one form does both: it flips the item to "paid" and writes the matching
// expense, linked back to the exact hotel or car so the trip still reconciles
// estimate against actual.

type PaidTarget =
  | { kind: "hotel"; id: string; tripId: string; label: string; payee: string; estimate: number }
  | { kind: "car"; id: string; tripId: string; label: string; payee: string; estimate: number }
  | { kind: "vendor"; id: string; tripId: string; label: string; payee: string; estimate: number };

// Resolve "hotel:<id>" and friends, re-checking the org and the member's trip
// scope. A stale or forged id resolves to nothing and the action is a no-op.
async function resolvePaidTarget(scope: Scope, ref: string): Promise<PaidTarget | null> {
  if (ref.startsWith("hotel:")) {
    const id = ref.slice(6);
    const h = await prisma.hotelBooking.findFirst({
      where: { id, night: { trip: scope.tripWhere } },
      select: { id: true, hotelName: true, cost: true, night: { select: { tripId: true, location: true } } },
    });
    if (!h) return null;
    return { kind: "hotel", id: h.id, tripId: h.night.tripId, label: `${h.hotelName}${h.night.location ? ` · ${h.night.location}` : ""}`, payee: h.hotelName, estimate: h.cost };
  }
  if (ref.startsWith("car:")) {
    const id = ref.slice(4);
    const c = await prisma.car.findFirst({
      where: { id, trip: scope.tripWhere },
      select: { id: true, tripId: true, label: true, carType: true, vendor: true, rentalCost: true, driverMode: true, driverCost: true },
    });
    if (!c) return null;
    // A hired driver's fee is part of what the car costs you.
    const estimate = c.rentalCost + (c.driverMode === "hired" ? c.driverCost : 0);
    return { kind: "car", id: c.id, tripId: c.tripId, label: `${c.label}${c.carType ? ` · ${c.carType}` : ""}`, payee: c.vendor || c.label, estimate };
  }
  if (ref.startsWith("vendor:")) {
    const id = ref.slice(7);
    const v = await prisma.vendorBooking.findFirst({
      where: { id, trip: scope.tripWhere },
      select: { id: true, tripId: true, vendorName: true, detail: true, cost: true, actualCost: true },
    });
    if (!v) return null;
    return { kind: "vendor", id: v.id, tripId: v.tripId, label: `${v.vendorName}${v.detail ? ` · ${v.detail}` : ""}`, payee: v.vendorName, estimate: v.actualCost ?? v.cost };
  }
  return null;
}

const CATEGORY_FOR: Record<PaidTarget["kind"], string> = { hotel: "hotel", car: "transport", vendor: "misc" };

export async function markItemPaid(formData: FormData) {
  const scope = await getScope();
  if (!scope) redirect("/login");

  const target = await resolvePaidTarget(scope, String(formData.get("ref") || ""));
  if (!target) { revalidatePath("/expenses"); return; }

  // Blank amount means "exactly what it was held at" — the common case.
  const amount = parseAmount(String(formData.get("amount") || "")) || target.estimate;
  if (amount <= 0) return;

  const dateStr = str(formData.get("date"));
  const paidPersonally = String(formData.get("paidPersonally") || "") === "on";

  await prisma.$transaction(async (tx) => {
    await tx.expense.create({
      data: {
        orgId: scope.orgId,
        tripId: target.tripId,
        // Kept for the older single-link readers; `items` is what's read now.
        hotelId: target.kind === "hotel" ? target.id : null,
        carId: target.kind === "car" ? target.id : null,
        date: toDay(dateStr) ?? todayDay(),
        category: CATEGORY_FOR[target.kind],
        payee: str(formData.get("payee")) || target.payee,
        amount,
        status: "paid",
        paymentMode: str(formData.get("paymentMode")),
        bankName: str(formData.get("bankName")),
        paidPersonally,
        paidBy: paidPersonally ? str(formData.get("paidBy")) : null,
        notes: str(formData.get("notes")),
        items: {
          create: [{
            hotelId: target.kind === "hotel" ? target.id : null,
            carId: target.kind === "car" ? target.id : null,
            vendorId: target.kind === "vendor" ? target.id : null,
            amount,
          }],
        },
      },
    });

    if (target.kind === "hotel") await tx.hotelBooking.update({ where: { id: target.id }, data: { status: "paid" } });
    else if (target.kind === "car") await tx.car.update({ where: { id: target.id }, data: { status: "paid" } });
    // A vendor booking records what it really cost as well as its status.
    else await tx.vendorBooking.update({ where: { id: target.id }, data: { status: "paid", actualCost: amount } });
  });

  await logActivity(
    scope.orgId,
    "expense",
    "create",
    `Marked ${target.label} paid — logged ${(await orgMoney()).fmt(amount)}${paidPersonally ? " (personal money, to be reimbursed)" : ""}`,
    `/trips/${target.tripId}`,
  );
  revalidatePath(`/trips/${target.tripId}`);
  revalidatePath("/expenses");
  revalidatePath("/hotels");
  revalidatePath("/", "layout");
}
