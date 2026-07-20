import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { bookingTaxable, bookingGst, bookingTcs, bookingTotal, bookingPaid, bookingBalance, bookingInclNonTaxCharge } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { amountInWords } from "@/lib/invoice";
import InvoiceDoc from "../InvoiceDoc";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { trip: { include: { org: true } }, variant: true, payments: true, inclusions: true, customer: true },
  });
  if (!b) return new Response("Not found", { status: 404 });
  if (!b.invoiceNo) return new Response("Invoice not generated", { status: 400 });

  const org = b.trip.org;
  const inr = (n: number) => formatINR(n).replace("₹", "Rs. ");
  const gst = bookingGst(b);
  const gstHalf = Math.round(gst / 2);
  const nonTax = (b.nonTaxable || 0) + bookingInclNonTaxCharge(b);
  const total = bookingTotal(b);
  const rate = b.gstRate ?? 5;

  const element = React.createElement(InvoiceDoc, {
    agency: org?.legalName || org?.name || "Trip Desk",
    gstAddress: org?.gstAddress ?? null,
    gstin: org?.gstin ?? null,
    gstState: org?.gstState ?? null,
    gstStateCode: org?.gstStateCode ?? null,
    logo: org?.logo ?? null,
    sacCode: org?.sacCode || "998555",
    note: org?.invoiceNote ?? null,
    invoiceNo: b.invoiceNo,
    date: (b.invoiceDate || b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    customerName: b.customerName,
    customerContact: [b.customer?.phone, b.customer?.email].filter(Boolean).join(" · "),
    tripName: b.trip.name,
    pax: b.pax,
    taxable: inr(bookingTaxable(b)),
    nonTax: inr(nonTax),
    nonTaxNum: nonTax,
    cgst: inr(gstHalf),
    sgst: inr(gst - gstHalf),
    tcs: inr(bookingTcs(b)),
    total: inr(total),
    paid: inr(bookingPaid(b)),
    balance: inr(bookingBalance(b)),
    gstHalfRate: rate / 2,
    tcsRate: b.tcsRate ?? 2,
    amountWords: amountInWords(total).replace(/ Rupees Only$/, ""),
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${b.invoiceNo.replace(/[^\w-]/g, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
