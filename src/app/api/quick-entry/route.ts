import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/scope";
import { isActive, bookingBalance } from "@/lib/calc";
import { formatINRShort } from "@/lib/money";

export const dynamic = "force-dynamic";

// Feeds the global Quick-entry launcher. Fetched lazily the first time the user
// opens the panel, so it never slows page loads. Scoped to the member's org/trips.
export async function GET() {
  const scope = await getScope();
  if (!scope) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const trips = await prisma.trip.findMany({
    where: scope.tripWhere,
    orderBy: [{ departureDate: "desc" }, { createdAt: "desc" }],
    include: {
      bookings: { where: { deletedAt: null }, include: { payments: true, variant: true } },
      itinerary: { select: { hotels: { select: { source: true } } } },
      cars: { select: { source: true } },
    },
  });

  const payable = trips
    .flatMap((t) => t.bookings.filter((b) => isActive(b.status)).map((b) => {
      const bal = bookingBalance(b);
      return { id: b.id, label: b.customerName, sub: `${t.name}${bal > 0 ? ` · ${formatINRShort(bal)} due` : " · fully paid"}`, _bal: bal };
    }))
    .sort((a, b) => b._bal - a._bal)
    .map(({ _bal, ...o }) => o);

  const customers = await prisma.customer.findMany({ where: { orgId: scope.orgId }, select: { name: true }, orderBy: { name: "asc" } });
  const customerNames = customers.map((c) => c.name);

  const sources = [...new Set(trips.flatMap((t) => [
    ...t.itinerary.flatMap((n) => n.hotels.map((h) => h.source)),
    ...t.cars.map((c) => c.source),
  ]).map((s) => (s || "").trim()).filter(Boolean))].sort();

  return NextResponse.json({
    payable,
    trips: trips.map((t) => ({ id: t.id, name: t.name })),
    customerNames,
    sources,
  });
}
