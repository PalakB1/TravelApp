"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getScope, canUseTrip } from "@/lib/scope";
import { parseAmount, formatINR } from "@/lib/money";
import { logActivity } from "../data-actions";

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
  const target = String(formData.get("target") || "");
  let tripId: string | null = null;
  let hotelId: string | null = null;
  let carId: string | null = null;

  if (target.startsWith("hotel:")) {
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

  const expense = await prisma.expense.create({
    data: {
      orgId: scope.orgId,
      tripId,
      hotelId,
      carId,
      date: dateStr ? new Date(dateStr) : new Date(),
      category: str(formData.get("category")) || "misc",
      payee: str(formData.get("payee")),
      amount,
      status: str(formData.get("status")) || "paid",
      paymentMode: str(formData.get("paymentMode")),
      notes: str(formData.get("notes")),
      fileName,
      fileType,
      fileData,
    },
    include: { trip: { select: { name: true } }, hotel: { select: { hotelName: true } }, car: { select: { label: true } } },
  });

  const targetLabel = expense.hotel ? `${expense.trip?.name ?? "trip"} › ${expense.hotel.hotelName}` : expense.car ? `${expense.trip?.name ?? "trip"} › ${expense.car.label}` : expense.trip ? expense.trip.name : "general";
  await logActivity(
    scope.orgId,
    "expense",
    "create",
    `Added ${formatINR(amount)} spend${expense.payee ? " to " + expense.payee : ""} · ${targetLabel}`,
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

  await prisma.expense.delete({ where: { id: exp.id } });
  await logActivity(scope.orgId, "expense", "delete", `Removed ${formatINR(exp.amount)} spend${exp.payee ? " to " + exp.payee : ""}`, "/expenses");
  revalidatePath("/expenses");
  revalidatePath("/", "layout");
}
