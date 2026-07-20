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

  // Trip is optional; if given it must belong to the org AND be one this member
  // is allowed to touch. Anything invalid falls back to a general (untagged) spend.
  let tripId: string | null = str(formData.get("tripId"));
  if (tripId && !(await canUseTrip(scope, tripId))) tripId = null;

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
    include: { trip: { select: { name: true } } },
  });

  await logActivity(
    scope.orgId,
    "expense",
    "create",
    `Added ${formatINR(amount)} spend${expense.payee ? " to " + expense.payee : ""}${expense.trip ? " · " + expense.trip.name : " · general"}`,
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
