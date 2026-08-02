import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";

export const dynamic = "force-dynamic";

// One CSV cell — quote it and double any inner quotes so commas/newlines are safe.
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cols: unknown[]) => cols.map(cell).join(",");
const d = (x: Date | null | undefined) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

// Download every booking as a spreadsheet — the "see everything in one go" view.
export async function GET() {
  const scope = await getScope();
  if (!scope) return new Response("Unauthorized", { status: 401 });

  const bookings = await prisma.booking.findMany({
    where: scope.viaTrip,
    include: { trip: true, payments: true },
    orderBy: [{ trip: { departureDate: "asc" } }, { customerName: "asc" }],
  });

  const header = ["Customer", "Phone", "Trip", "Departure", "Pax", "Status", "Visa", "Total (₹)", "Paid (₹)", "Balance (₹)", "Invoice No", "Invoice date"];
  const lines = [row(header)];
  for (const b of bookings) {
    lines.push(row([
      b.customerName, b.customerPhone ?? "", b.trip.name, d(b.trip.departureDate), b.pax, b.status,
      b.visaStatus, bookingTotal(b), bookingPaid(b), bookingBalance(b), b.invoiceNo ?? "", d(b.invoiceDate),
    ]));
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM so Excel reads ₹ / UTF-8 correctly

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
