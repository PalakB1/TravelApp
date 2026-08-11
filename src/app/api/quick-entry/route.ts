import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/scope";
import { isActive, bookingBalance } from "@/lib/calc";
import { orgMoney } from "@/lib/orgMoney";

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
      itinerary: { orderBy: { order: "asc" }, select: { date: true, location: true, hotels: { select: { id: true, hotelName: true, source: true } } } },
      cars: { select: { id: true, label: true, carType: true, source: true } },
      vendorBookings: { select: { id: true, vendorName: true, detail: true } },
    },
  });

  // Resolved once — the map callback below is synchronous.
  const $ = await orgMoney();

  const payable = trips
    .flatMap((t) => t.bookings.filter((b) => isActive(b.status)).map((b) => {
      const bal = bookingBalance(b);
      return { id: b.id, label: b.customerName, sub: `${t.name}${bal > 0 ? ` · ${$.short(bal)} due` : " · fully paid"}`, _bal: bal };
    }))
    .sort((a, b) => b._bal - a._bal)
    .map(({ _bal, ...o }) => o);

  const customers = await prisma.customer.findMany({ where: { orgId: scope.orgId }, select: { name: true }, orderBy: { name: "asc" } });
  const customerNames = customers.map((c) => c.name);

  const sources = [...new Set(trips.flatMap((t) => [
    ...t.itinerary.flatMap((n) => n.hotels.map((h) => h.source)),
    ...t.cars.map((c) => c.source),
  ]).map((s) => (s || "").trim()).filter(Boolean))].sort();

  // Quick add logs a spend with the same fields as the Costing form, so it needs
  // the same pickers: every taggable item in each trip, and the accounts already
  // in use.
  const targetTrips = trips.map((t) => ({
    id: t.id,
    name: t.name,
    items: [
      ...t.itinerary.flatMap((n) =>
        n.hotels.map((h) => ({
          ref: `hotel:${h.id}`,
          label: `${h.hotelName}${n.location ? ` · ${n.location}` : ""}${n.date ? ` · ${n.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`,
          group: "Hotels",
        })),
      ),
      ...t.cars.map((c) => ({ ref: `car:${c.id}`, label: `${c.label}${c.carType ? ` · ${c.carType}` : ""}`, group: "Cars" })),
      ...t.vendorBookings.map((v) => ({ ref: `vendor:${v.id}`, label: `${v.vendorName}${v.detail ? ` · ${v.detail}` : ""}`, group: "Extras & suppliers" })),
    ],
  }));

  const bankRows = await prisma.expense.findMany({
    where: { orgId: scope.orgId, bankName: { not: null }, deletedAt: null },
    select: { bankName: true }, distinct: ["bankName"], take: 40,
  });
  const banks = bankRows.map((b) => b.bankName!).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const me = await prisma.user.findUnique({ where: { id: scope.userId }, select: { name: true } });

  return NextResponse.json({
    payable,
    trips: trips.map((t) => ({ id: t.id, name: t.name })),
    customerNames,
    sources,
    targetTrips,
    banks,
    myName: me?.name ?? "",
    symbol: $.symbol,
  });
}
