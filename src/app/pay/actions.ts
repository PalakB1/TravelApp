"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";

export type PayResult = { ok: boolean; message: string };

// PUBLIC — no auth. A customer self-reports a payment from a shared link.
// Two shapes: a per-person link supplies bookingId; the universal link supplies
// tripId + the payer's typed name (we match it to a booking, or leave it attached
// to the trip for the operator to link). Nothing changes until they approve.
export async function submitPendingPayment(_prev: PayResult | undefined, formData: FormData): Promise<PayResult> {
  const amount = parseAmount(String(formData.get("amount")));
  if (amount <= 0) return { ok: false, message: "Please enter the amount you paid." };

  const bookingIdIn = String(formData.get("bookingId") || "");
  const tripIdIn = String(formData.get("tripId") || "");
  const payerName = String(formData.get("payerName") || "").trim();

  let bookingId: string | null = null;
  let tripId: string | null = null;

  if (bookingIdIn) {
    const booking = await prisma.booking.findUnique({ where: { id: bookingIdIn }, select: { id: true } });
    if (!booking) return { ok: false, message: "This payment link is invalid." };
    bookingId = booking.id;
  } else if (tripIdIn) {
    const trip = await prisma.trip.findFirst({ where: { id: tripIdIn, org: { status: "approved" } }, select: { id: true } });
    if (!trip) return { ok: false, message: "This payment link is invalid." };
    if (!payerName) return { ok: false, message: "Please enter your name (as given at booking)." };
    tripId = trip.id;
    // Try to resolve the payer to a booking WITHOUT ever exposing other names.
    const bookings = await prisma.booking.findMany({ where: { tripId }, select: { id: true, customerName: true } });
    const n = payerName.toLowerCase();
    const exact = bookings.filter((b) => b.customerName.trim().toLowerCase() === n);
    const partial = bookings.filter((b) => { const c = b.customerName.trim().toLowerCase(); return c.includes(n) || n.includes(c); });
    const match = exact.length === 1 ? exact[0] : partial.length === 1 ? partial[0] : null;
    if (match) { bookingId = match.id; tripId = null; }
  } else {
    return { ok: false, message: "This payment link is invalid." };
  }

  let screenshot: string | undefined;
  const file = formData.get("screenshot");
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    const f = file as File;
    if (f.size > 4_500_000) return { ok: false, message: "Screenshot is too large — please upload one under 4 MB." };
    const buf = Buffer.from(await f.arrayBuffer());
    screenshot = `data:${f.type || "image/jpeg"};base64,${buf.toString("base64")}`;
  }

  const dateStr = String(formData.get("date") || "");
  await prisma.pendingPayment.create({
    data: {
      bookingId,
      tripId,
      amount,
      mode: String(formData.get("mode") || "upi"),
      date: dateStr ? new Date(dateStr) : new Date(),
      reference: String(formData.get("reference") || "") || null,
      payerName: String(formData.get("payerName") || "") || null,
      note: String(formData.get("note") || "") || null,
      screenshot: screenshot || null,
    },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: "Thank you! Your payment has been submitted and is pending confirmation." };
}
