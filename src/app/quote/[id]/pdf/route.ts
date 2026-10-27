import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { quoteTotals, quoteExpired, lineTotal } from "@/lib/quote";
import { buildMoney } from "@/lib/orgMoney";
import QuoteDoc from "../QuoteDoc";

export const dynamic = "force-dynamic";

const day = (d: Date | null) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quotation.findFirst({
    where: { id, deletedAt: null },
    include: { items: { orderBy: { order: "asc" } }, org: true, trip: { select: { name: true, destination: true, nights: true } } },
  });
  if (!q) return new Response("Not found", { status: 404 });
  if (q.status === "draft") return new Response("This quotation has not been sent yet", { status: 400 });

  const $ = buildMoney(q.org);
  // The base PDF fonts can't draw — – · … or anything outside Latin-1.
  const ascii = (s?: string | null) =>
    (s || "").replace(/[—–]/g, "-").replace(/·/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, "...").replace(/[^\x00-\xff]/g, "");
  const money = (n: number) => $.fmt(n).replace("₹", "Rs. ");

  const t = quoteTotals(q.items, q.taxRate, q.pax);
  const title = [q.title, q.trip?.destination, q.trip && q.trip.nights > 0 ? `${q.trip.nights} nights` : null]
    .filter(Boolean)
    .join(" - ");

  const element = React.createElement(QuoteDoc, {
    agency: ascii(q.org?.legalName || q.org?.name || "TripZei"),
    logo: q.org?.logo ?? null,
    poweredBy: !q.org?.hideBranding,
    gstAddress: ascii(q.org?.gstAddress),
    gstin: q.org?.gstin ?? null,
    taxIdLabel: $.taxIdLabel,

    quoteNo: q.quoteNo,
    date: day(q.createdAt)!,
    validUntil: day(q.validUntil),
    expired: quoteExpired(q.validUntil),

    clientName: ascii(q.clientName),
    clientPhone: q.clientPhone ?? null,
    clientEmail: q.clientEmail ?? null,
    pax: q.pax > 0 ? String(q.pax) : null,

    title: ascii(title),
    lines: q.items.map((it) => ({
      label: ascii(it.label),
      detail: ascii(it.detail),
      qty: String(it.qty),
      rate: money(it.unitPrice),
      amount: money(lineTotal(it)),
    })),
    subtotal: money(t.taxableBase),
    taxLabel: ascii(q.taxLabel),
    taxRate: q.taxRate,
    tax: money(t.tax),
    nonTaxable: t.nonTaxable !== 0 ? money(t.nonTaxable) : null,
    total: money(t.total),
    perPerson: t.perPerson != null ? money(t.perPerson) : null,
    notes: ascii(q.notes),
  }) as unknown as Parameters<typeof renderToBuffer>[0];

  const buffer = await renderToBuffer(element);
  const name = (q.quoteNo || `quotation-${q.clientName}`).replace(/[^A-Za-z0-9-]+/g, "-");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
