import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { amountInWords } from "@/lib/invoice";
import ReceiptDoc from "../ReceiptDoc";

export const dynamic = "force-dynamic";

// PUBLIC — downloads the payment receipt as a real PDF file.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.payment.findUnique({
    where: { id },
    include: { booking: { include: { trip: { include: { org: true } }, variant: true, payments: true } } },
  });
  if (!p) return new Response("Receipt not found", { status: 404 });

  const b = p.booking;
  const org = b.trip.org;
  const receiptNo = `RCPT-${p.id.slice(-6).toUpperCase()}`;
  // The built-in PDF fonts have no ₹ glyph, so render amounts as "Rs."
  const inr = (n: number) => formatINR(n).replace("₹", "Rs. ");
  const ascii = (s?: string | null) => (s || "").replace(/[—–]/g, "-").replace(/·/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[^\x00-\xff]/g, "");

  const element = React.createElement(ReceiptDoc, {
      agency: ascii(org?.legalName || org?.name || "Trip Desk"),
      gstAddress: ascii(org?.gstAddress),
      gstin: org?.gstin ?? null,
      receiptNo,
      date: p.date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      customerName: ascii(b.customerName),
      tripName: ascii(b.trip.name),
      mode: p.mode.toUpperCase(),
      note: ascii(p.note),
      amount: inr(p.amount),
      amountWords: amountInWords(p.amount).replace(/ Rupees Only$/, ""),
      total: inr(bookingTotal(b)),
      paidToDate: inr(bookingPaid(b)),
      balance: inr(bookingBalance(b)),
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
