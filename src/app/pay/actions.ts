"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmount } from "@/lib/money";

export type PayResult = { ok: boolean; message: string };

// PUBLIC — no auth. A customer self-reports a payment from the shared link.
// It lands as a PendingPayment and changes nothing until the operator approves.
export async function submitPendingPayment(_prev: PayResult | undefined, formData: FormData): Promise<PayResult> {
  const bookingId = String(formData.get("bookingId") || "");
  const amount = parseAmount(String(formData.get("amount")));
  if (!bookingId || amount <= 0) return { ok: false, message: "Please enter the amount you paid." };

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true } });
  if (!booking) return { ok: false, message: "This payment link is invalid." };

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
