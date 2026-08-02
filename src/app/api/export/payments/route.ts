import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (cols: unknown[]) => cols.map(cell).join(",");
const d = (x: Date | null | undefined) => (x ? new Date(x).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

// Download every recorded payment as a spreadsheet.
export async function GET() {
  const scope = await getScope();
  if (!scope) return new Response("Unauthorized", { status: 401 });

  const payments = await prisma.payment.findMany({
    where: { booking: { ...scope.viaTrip, deletedAt: null } },
    include: { booking: { include: { trip: true } } },
    orderBy: { date: "desc" },
  });

  const header = ["Date", "Customer", "Trip", "Mode", "Amount (₹)", "Note"];
  const lines = [row(header)];
  for (const p of payments) {
    lines.push(row([d(p.date), p.booking.customerName, p.booking.trip.name, p.mode, p.amount, p.note ?? ""]));
  }
  const csv = "﻿" + lines.join("\r\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
