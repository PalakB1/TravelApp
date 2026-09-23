import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getScope } from "@/lib/scope";
import { orgMoney } from "@/lib/orgMoney";
import { bookingBalance } from "@/lib/calc";

export const dynamic = "force-dynamic";

// One box, everything findable: a customer, a booking, a trip, a hotel.
//
// Built to cost nothing when it isn't used. This route is only called once
// someone has typed two characters, the client debounces and cancels in-flight
// requests, and every query is capped and selects only the handful of fields
// the result row shows. Nothing is preloaded into any page.

const MIN = 2;      // below this, a search matches half the database
const PER_KIND = 5; // enough to recognise the one you meant, not a second list

export type Hit = { kind: string; title: string; sub: string; href: string };

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < MIN) return NextResponse.json({ hits: [] });

  const scope = await getScope();
  if (!scope) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const like = { contains: q, mode: "insensitive" as const };

  // Four independent queries, so they go together rather than in a queue.
  const [bookings, customers, trips, hotels] = await Promise.all([
    prisma.booking.findMany({
      where: { ...scope.viaTrip, deletedAt: null, OR: [{ customerName: like }, { customerPhone: like }] },
      take: PER_KIND,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, customerName: true, customerPhone: true, status: true, pax: true,
        landAmount: true, visaAmount: true, flightAmount: true, nonTaxable: true,
        discount: true, gstRate: true, tcsRate: true, inclTaxPP: true, inclNonTaxPP: true,
        travellerExtra: true, payments: { select: { amount: true } },
        variant: { select: { sellPrice: true } }, trip: { select: { name: true } },
      },
    }),
    prisma.customer.findMany({
      where: { orgId: scope.orgId, deletedAt: null, OR: [{ name: like }, { phone: like }, { email: like }] },
      take: PER_KIND,
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, email: true },
    }),
    prisma.trip.findMany({
      where: { ...scope.tripWhere, OR: [{ name: like }, { destination: like }] },
      take: PER_KIND,
      orderBy: { departureDate: "desc" },
      select: { id: true, name: true, destination: true, departureDate: true },
    }),
    prisma.hotelBooking.findMany({
      where: { hotelName: like, night: { trip: scope.tripWhere } },
      take: PER_KIND,
      orderBy: { createdAt: "desc" },
      select: { id: true, hotelName: true, status: true, night: { select: { location: true, trip: { select: { id: true, name: true } } } } },
    }),
  ]);

  const $ = await orgMoney();
  const fmtDay = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "no date yet";

  const hits: Hit[] = [
    ...bookings.map((b) => {
      const bal = bookingBalance(b as never);
      return {
        kind: "Booking",
        title: b.customerName,
        sub: `${b.trip.name} · ${b.pax} pax · ${bal > 0 ? `${$.fmt(bal)} due` : "paid"}`,
        href: `/bookings/${b.id}`,
      };
    }),
    ...customers.map((c) => ({
      kind: "Customer",
      title: c.name,
      sub: [c.phone, c.email].filter(Boolean).join(" · ") || "no contact details",
      href: `/customers/${c.id}`,
    })),
    ...trips.map((t) => ({
      kind: "Trip",
      title: t.name,
      sub: `${t.destination || "—"} · ${fmtDay(t.departureDate)}`,
      href: `/trips/${t.id}`,
    })),
    ...hotels.map((h) => ({
      kind: "Hotel",
      title: h.hotelName,
      sub: `${h.night.location} · ${h.night.trip.name} · ${h.status}`,
      href: `/trips/${h.night.trip.id}`,
    })),
  ];

  return NextResponse.json({ hits });
}
