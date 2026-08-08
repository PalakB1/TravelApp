// Builds the public demo workspace: `npm run db:demo`
//
// Three trips at three different stages, because that's the whole pitch —
// a finished trip with its profit banked, a live one with money still coming
// in, and one still filling up. A prospect who logs in should recognise their
// own week inside ten seconds.
//
// The script is destructive but *only* within the demo org: it deletes that
// org and everything under it, then rebuilds. Run it as often as you like —
// visitors will make a mess, and this is the broom.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_ORG_NAME, DEMO_STAFF_EMAIL } from "../src/lib/demo";

const prisma = new PrismaClient();

// Dates are all relative to the run, so the demo never goes stale: trip one is
// always "two months ago", trip two is always "next month".
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const day = (offset: number) => new Date(TODAY.getTime() + offset * 86_400_000);

// ---------------------------------------------------------------------------
// Booking maths, mirrored from src/lib/calc.ts so the seeded payments actually
// reconcile against what the app will display. If calc.ts changes, this is the
// one place the demo needs updating.
// ---------------------------------------------------------------------------
type Money = {
  pax: number;
  landAmount?: number;
  visaAmount?: number;
  flightAmount?: number;
  nonTaxable?: number;
  discount?: number;
  inclTaxPP?: number;
  inclNonTaxPP?: number;
  travellerExtra?: number;
  gstRate?: number;
  tcsRate?: number;
};
function totalOf(b: Money): number {
  const base = (b.landAmount || 0) + (b.visaAmount || 0) + (b.flightAmount || 0);
  const taxable =
    Math.max(0, base - (b.discount || 0)) + (b.inclTaxPP || 0) * b.pax + (b.travellerExtra || 0);
  const gst = Math.round((taxable * (b.gstRate ?? 5)) / 100);
  const tcs = Math.round(((taxable + gst) * (b.tcsRate ?? 2)) / 100);
  const nonTax = (b.nonTaxable || 0) + (b.inclNonTaxPP || 0) * b.pax;
  return taxable + gst + tcs + nonTax;
}
// Round to something a human would actually transfer.
const round500 = (n: number) => Math.round(n / 500) * 500;

async function wipeDemo() {
  const org = await prisma.organization.findFirst({ where: { name: DEMO_ORG_NAME } });
  if (!org) return;
  const orgId = org.id;
  const tripIds = (await prisma.trip.findMany({ where: { orgId }, select: { id: true } })).map((t) => t.id);

  // Ordered by hand rather than leaning on cascades: Trip→Organization is an
  // optional relation, so deleting the org would orphan its trips, not remove
  // them. Children first, parents last.
  await prisma.expense.deleteMany({ where: { orgId } });
  await prisma.settlement.deleteMany({ where: { orgId } });
  if (tripIds.length) {
    await prisma.pendingPayment.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.booking.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.visaApplicant.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.vendorBooking.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.car.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.night.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.inclusion.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.tripAccess.deleteMany({ where: { tripId: { in: tripIds } } });
    await prisma.variant.deleteMany({ where: { tripId: { in: tripIds } } });
  }
  await prisma.trip.deleteMany({ where: { orgId } });
  await prisma.customTrip.deleteMany({ where: { orgId } });
  await prisma.customer.deleteMany({ where: { orgId } });
  await prisma.activityLog.deleteMany({ where: { orgId } });
  await prisma.paymentPlanTemplate.deleteMany({ where: { orgId } });
  await prisma.invoiceSeq.deleteMany({ where: { orgId } });
  await prisma.user.deleteMany({ where: { orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
  console.log("· cleared the previous demo workspace");
}

// The customer book. Notes are written the way a real coordinator writes them —
// the small operational details that make the demo feel lived-in.
const PEOPLE = [
  { name: "Rohan Sharma", phone: "+919820011223", email: "rohan.sharma@example.com", notes: "Repeat client — third trip with us. Prefers window seats and always upgrades the hotel." },
  { name: "Meera Iyer", phone: "+919845066771", email: "meera.iyer@example.com", notes: "Photographer. Asks for early check-in for sunrise shoots." },
  { name: "Kabir Kapoor", phone: "+919833410098", email: "kabir.kapoor@example.com" },
  { name: "Sneha Reddy", phone: "+919701223344", email: "sneha.reddy@example.com", notes: "Vegetarian, no onion or garlic. Flag this with every hotel." },
  { name: "Aditya Bansal", phone: "+919811556677", email: "aditya.bansal@example.com" },
  { name: "Farah Qureshi", phone: "+919867001122", email: "farah.q@example.com", notes: "Travelling with two children (7 and 11). Needs a connecting room." },
  { name: "Vikram Rao", phone: "+919900112233", email: "vikram.rao@example.com" },
  { name: "Ananya Ghosh", phone: "+919830778899", email: "ananya.ghosh@example.com", notes: "Corporate account — invoices go to her company GSTIN." },
  { name: "Imran Shaikh", phone: "+919820445566", email: "imran.shaikh@example.com" },
  { name: "Divya Menon", phone: "+919846223311", email: "divya.menon@example.com" },
  { name: "Nikhil Joshi", phone: "+919921334455", email: "nikhil.joshi@example.com" },
  { name: "Tara Suri", phone: "+919810998877", email: "tara.suri@example.com", notes: "Enquiry only — waiting on her husband's leave approval." },
];
const phoneOf = (name: string) => PEOPLE.find((p) => p.name === name)?.phone ?? null;

const POLICY = `Free cancellation up to 45 days before departure.
44–30 days before departure: 25% of the package value is retained.
29–15 days before departure: 50% is retained.
14 days or fewer: no refund. Airline and visa fees already paid to third parties are non-refundable at any stage.`;

async function main() {
  await wipeDemo();

  // Any stray account on these addresses would block the create below.
  await prisma.user.deleteMany({ where: { email: { in: [DEMO_EMAIL, DEMO_STAFF_EMAIL] } } });

  const org = await prisma.organization.create({
    data: {
      name: DEMO_ORG_NAME,
      status: "approved",
      plan: "business", // every module visible — a demo shouldn't hide features
      customTripsEnabled: true,
      legalName: "Northlight Journeys Pvt Ltd",
      gstin: "27AAGCN4321L1ZP",
      gstAddress: "402, Sunbeam Chambers, Andheri West, Mumbai 400058",
      gstState: "Maharashtra",
      gstStateCode: "27",
      invoiceNote: "Thank you for travelling with Northlight Journeys.",
      defaultRefundPolicy: POLICY,
    },
  });
  const orgId = org.id;

  await prisma.user.createMany({
    data: [
      {
        orgId,
        email: DEMO_EMAIL,
        name: "Arjun Mehta",
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        isOrgAdmin: true,
      },
      {
        orgId,
        email: DEMO_STAFF_EMAIL,
        name: "Priya Nair",
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      },
    ],
  });

  // --- Payment plan templates --------------------------------------------
  await prisma.paymentPlanTemplate.create({
    data: {
      orgId,
      name: "Standard — 25% now, balance 3 weeks out",
      isDefault: true,
      order: 0,
      steps: {
        create: [
          { label: "Booking amount", kind: "percent", percent: 25, daysBeforeTravel: null, order: 0 },
          { label: "Balance", kind: "balance", daysBeforeTravel: 21, order: 1 },
        ],
      },
    },
  });
  await prisma.paymentPlanTemplate.create({
    data: {
      orgId,
      name: "Long-haul — three installments",
      order: 1,
      steps: {
        create: [
          { label: "Booking amount", kind: "percent", percent: 30, daysBeforeTravel: null, order: 0 },
          { label: "Second installment", kind: "percent", percent: 40, daysBeforeTravel: 60, order: 1 },
          { label: "Balance", kind: "balance", daysBeforeTravel: 21, order: 2 },
        ],
      },
    },
  });
  console.log("· payment plans");

  // --- Customers ----------------------------------------------------------
  const customers: Record<string, string> = {};
  for (const p of PEOPLE) {
    const c = await prisma.customer.create({ data: { orgId, ...p } });
    customers[p.name] = c.id;
  }
  console.log(`· ${PEOPLE.length} customers`);

  await seedIceland(orgId, customers);
  await seedBali(orgId, customers);
  await seedVietnam(orgId, customers);
  await seedOverheads(orgId);

  console.log(`\n✓ Demo ready — ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// ===========================================================================
// TRIP 1 — finished, fully paid, profit banked. The "this is what good looks
// like" trip: every night confirmed, invoices raised, tax remitted.
// ===========================================================================
async function seedIceland(orgId: string, customers: Record<string, string>) {
  const departure = day(-55);
  const trip = await prisma.trip.create({
    data: {
      orgId,
      name: "Iceland Ring Road Self-Drive",
      destination: "Iceland",
      nights: 8,
      days: 9,
      departureDate: departure,
      endDate: day(-47),
      capacity: 12,
      maxPerRoom: 2,
      notes:
        "COMPLETED TRIP — open the Costing tab to see how the margin landed against the estimate. " +
        "Every night is confirmed, invoices are raised and the GST has been remitted. " +
        "This is what a trip looks like once it's closed out.",
    },
  });

  const twin = await prisma.variant.create({ data: { tripId: trip.id, name: "Twin share", sellPrice: 165000, occupancy: "twin share" } });
  await prisma.variant.create({ data: { tripId: trip.id, name: "Single occupancy", sellPrice: 214000, occupancy: "single" } });

  // Inclusion `cost` is per person and the trip's profit adds it to the hotel,
  // car and vendor rows. So anything already costed on the itinerary is listed
  // here at zero — otherwise the same hotel night is paid for twice and the
  // margin comes out fictional.
  const incl = [
    { name: "Hotels as per itinerary", category: "hotel", isDefault: true, cost: 0, sellContribution: 0 },
    { name: "4x4 self-drive car", category: "car", isDefault: true, cost: 0, sellContribution: 0 },
    { name: "Airport transfers", category: "transfer", isDefault: true, cost: 4500, sellContribution: 0 },
    { name: "Travel insurance", category: "other", isDefault: true, cost: 2400, sellContribution: 0 },
    { name: "Fuel & tolls allowance", category: "other", isDefault: true, cost: 6800, sellContribution: 0 },
    { name: "Blue Lagoon Premium", category: "tour", isDefault: false, cost: 9500, sellContribution: 13500 },
    { name: "Glacier hike, Sólheimajökull", category: "tour", isDefault: false, cost: 11000, sellContribution: 15500 },
    { name: "Whale watching, Húsavík", category: "tour", isDefault: false, cost: 6500, sellContribution: 9000 },
  ];
  const inclIds: Record<string, string> = {};
  for (const i of incl) {
    const row = await prisma.inclusion.create({ data: { tripId: trip.id, ...i } });
    inclIds[i.name] = row.id;
  }
  const DEFAULT_COST_PP = 4500 + 2400 + 6800;

  const stops = ["Reykjavík", "Vík í Mýrdal", "Höfn", "Egilsstaðir", "Mývatn", "Akureyri", "Borgarnes", "Reykjavík"];
  const hotels = ["Fosshotel Reykjavík", "Hotel Dyrhólaey", "Hotel Höfn", "Hótel Valaskjálf", "Fosshotel Mývatn", "Hotel Kea", "Hotel Hamar", "Fosshotel Reykjavík"];
  for (let i = 0; i < stops.length; i++) {
    await prisma.night.create({
      data: {
        tripId: trip.id,
        order: i,
        date: day(-55 + i),
        location: stops[i],
        hotels: {
          create: {
            hotelName: hotels[i],
            rooms: 5,
            cost: 88000 + i * 3000, // 5 twin rooms a night
            status: "final",
            source: "Booking.com",
            confirmationNo: `BK-${4200 + i}`,
          },
        },
      },
    });
  }

  for (let i = 1; i <= 3; i++) {
    await prisma.car.create({
      data: {
        tripId: trip.id,
        label: `Car ${i}`,
        carType: "Dacia Duster 4x4",
        seats: 5,
        vendor: "Blue Car Rental",
        startDate: departure,
        endDate: day(-47),
        rentalCost: 142000,
        driverMode: "self",
        status: "final",
        confirmationNo: `BCR-77${i}`,
      },
    });
  }

  // Only things NOT already priced per person as an inclusion — otherwise the
  // activities would be counted twice, here and in inclCostPP.
  await prisma.vendorBooking.createMany({
    data: [
      { tripId: trip.id, type: "permit", vendorName: "Þingvellir National Park", detail: "Group parking permits", cost: 9000, actualCost: 9000, status: "paid", date: day(-54) },
      { tripId: trip.id, type: "parking", vendorName: "Vaðlaheiðargöng", detail: "Tunnel tolls, 3 cars", cost: 12000, actualCost: 14000, status: "paid", date: day(-49) },
    ],
  });

  // Four bookings, ten travellers, all travelled and settled in full.
  const rows = [
    { who: "Rohan Sharma", pax: 4, upsells: ["Blue Lagoon Premium", "Glacier hike, Sólheimajökull"], note: "Family of four. Booked 5 months ahead." },
    { who: "Meera Iyer", pax: 2, upsells: ["Whale watching, Húsavík"], note: "" },
    { who: "Kabir Kapoor", pax: 2, upsells: ["Blue Lagoon Premium"], note: "" },
    { who: "Sneha Reddy", pax: 2, upsells: ["Glacier hike, Sólheimajökull", "Whale watching, Húsavík"], note: "Strict vegetarian — all hotels informed." },
  ];

  let seq = 1;
  for (const r of rows) {
    const inclTaxPP = r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.sellContribution || 0), 0);
    const inclCostPP = DEFAULT_COST_PP + r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.cost || 0), 0);
    const money = {
      pax: r.pax,
      landAmount: 165000 * r.pax,
      visaAmount: 5000 * r.pax, // our Schengen assistance charge
      nonTaxable: 8500 * r.pax, // embassy fee, billed at cost without GST
      inclTaxPP,
      gstRate: 5,
      tcsRate: 2,
    };
    const total = totalOf(money);

    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        variantId: twin.id,
        customerId: customers[r.who],
        customerName: r.who,
        customerPhone: phoneOf(r.who),
        packageType: "lva",
        ...money,
        inclCostPP,
        status: "travelled",
        visaStatus: "approved",
        visaHandledBy: "us",
        notes: r.note || null,
        invoiceNo: `NJ/2026-27/${String(seq).padStart(4, "0")}`,
        invoiceDate: day(-70),
        taxRemitted: true,
        taxRemittedOn: day(-30),
        taxRemittedNote: "GSTR-3B filed for the quarter",
        refundPolicy: POLICY,
        freeCancelUntil: day(-100),
      },
    });
    seq++;

    // Selected inclusions, snapshotted the way the app does it.
    for (const i of incl.filter((x) => x.isDefault || r.upsells.includes(x.name))) {
      await prisma.bookingInclusion.create({
        data: {
          bookingId: booking.id,
          inclusionId: inclIds[i.name],
          name: i.name,
          cost: i.cost,
          charge: i.isDefault ? 0 : i.sellContribution,
          isDefault: i.isDefault,
          bookedAt: day(-120),
        },
      });
    }

    // Paid in three parts, finishing before departure.
    const first = round500(total * 0.25);
    const second = round500(total * 0.45);
    await prisma.payment.createMany({
      data: [
        { bookingId: booking.id, amount: first, date: day(-130), mode: "bank", note: "Booking amount" },
        { bookingId: booking.id, amount: second, date: day(-90), mode: "upi", note: "Second installment" },
        { bookingId: booking.id, amount: total - first - second, date: day(-62), mode: "bank", note: "Final balance" },
      ],
    });
  }

  // What the trip actually cost us.
  await prisma.expense.createMany({
    data: [
      { orgId, tripId: trip.id, date: day(-80), category: "hotel", payee: "Booking.com", amount: 788000, status: "paid", paymentMode: "card", bankName: "HDFC Bank", notes: "All 8 nights, 5 rooms, prepaid" },
      { orgId, tripId: trip.id, date: day(-78), category: "transport", payee: "Blue Car Rental", amount: 426000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank", notes: "3 × Dacia Duster, 9 days" },
      { orgId, tripId: trip.id, date: day(-54), category: "permit", payee: "Blue Lagoon", amount: 57000, status: "paid", paymentMode: "card", bankName: "ICICI Bank" },
      { orgId, tripId: trip.id, date: day(-51), category: "guide", payee: "Arctic Adventures", amount: 46500, status: "paid", paymentMode: "card", bankName: "ICICI Bank" },
      { orgId, tripId: trip.id, date: day(-49), category: "misc", payee: "Gentle Giants", amount: 26000, status: "paid", paymentMode: "card", bankName: "ICICI Bank" },
      { orgId, tripId: trip.id, date: day(-52), category: "visa", payee: "VFS Global", amount: 85000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank", notes: "Schengen fees, 10 applicants — billed on at cost, no GST" },
      { orgId, tripId: trip.id, date: day(-76), category: "transport", payee: "Reykjavík Excursions", amount: 45000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank", notes: "Airport transfers both ways" },
      { orgId, tripId: trip.id, date: day(-76), category: "misc", payee: "TATA AIG", amount: 24000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank", notes: "Group travel insurance" },
      { orgId, tripId: trip.id, date: day(-49), category: "permit", payee: "Parking & tunnel tolls", amount: 23000, status: "paid", paymentMode: "card", bankName: "ICICI Bank" },
    ],
  });

  // One expense paid out of pocket, then reimbursed — shows the settlement flow.
  const fuel = await prisma.expense.create({
    data: {
      orgId, tripId: trip.id, date: day(-50), category: "fuel", payee: "N1 / Olís", amount: 64500,
      status: "paid", paymentMode: "card", paidPersonally: true, paidBy: "Priya Nair",
      notes: "Fuel across the ring road — Priya's personal card, reimbursed after the trip.",
    },
  });
  const settlement = await prisma.settlement.create({
    data: { orgId, date: day(-44), reference: "UTR8842190365", bankName: "HDFC Bank", paidTo: "Priya Nair", amount: 64500, notes: "Iceland fuel reimbursement" },
  });
  await prisma.expense.update({ where: { id: fuel.id }, data: { settlementId: settlement.id } });

  console.log("· trip 1 — Iceland (completed)");
}

// ===========================================================================
// TRIP 2 — departs next month. Money still landing, one night unbooked, holds
// about to lapse, a customer payment waiting to be approved. The busy trip.
// ===========================================================================
async function seedBali(orgId: string, customers: Record<string, string>) {
  const departure = day(41);
  const trip = await prisma.trip.create({
    data: {
      orgId,
      name: "Bali Family Escape",
      destination: "Bali, Indonesia",
      nights: 6,
      days: 7,
      departureDate: departure,
      endDate: day(47),
      capacity: 24,
      maxPerRoom: 3,
      notes:
        "LIVE TRIP, departs in about six weeks. Look for the night highlighted in red on the itinerary — " +
        "that's a night with no hotel held, which is the mistake this dashboard exists to catch. " +
        "Two hotel holds also lapse this week, and one customer has uploaded a payment waiting for your approval.",
    },
  });

  const std = await prisma.variant.create({ data: { tripId: trip.id, name: "Standard twin", sellPrice: 68000, occupancy: "twin share" } });
  const deluxe = await prisma.variant.create({ data: { tripId: trip.id, name: "Deluxe pool villa", sellPrice: 96000, occupancy: "twin share" } });

  const incl = [
    // Zero-cost: the hotels are costed night by night on the itinerary.
    { name: "Hotels as per itinerary", category: "hotel", isDefault: true, cost: 0, sellContribution: 0 },
    { name: "Daily breakfast", category: "meal", isDefault: true, cost: 4200, sellContribution: 0 },
    { name: "Airport + inter-city transfers", category: "transfer", isDefault: true, cost: 6000, sellContribution: 0 },
    { name: "Uluwatu sunset & Kecak dance", category: "tour", isDefault: false, cost: 4500, sellContribution: 6500 },
    { name: "Nusa Penida day trip", category: "tour", isDefault: false, cost: 7000, sellContribution: 9500 },
  ];
  const inclIds: Record<string, string> = {};
  for (const i of incl) {
    const row = await prisma.inclusion.create({ data: { tripId: trip.id, ...i } });
    inclIds[i.name] = row.id;
  }
  const DEFAULT_COST_PP = 4200 + 6000;

  // Night 4 is deliberately left without a hotel — the gap the board flags red.
  const plan: Array<{ loc: string; hotel: string | null; status?: string; hold?: number }> = [
    { loc: "Seminyak", hotel: "The Legian Seminyak", status: "final" },
    { loc: "Seminyak", hotel: "The Legian Seminyak", status: "final" },
    { loc: "Ubud", hotel: "Komaneka at Bisma", status: "hold", hold: 1 },
    { loc: "Ubud", hotel: null },
    { loc: "Nusa Dua", hotel: "Sofitel Bali", status: "hold", hold: 3 },
    { loc: "Nusa Dua", hotel: "Sofitel Bali", status: "final" },
  ];
  for (let i = 0; i < plan.length; i++) {
    const n = plan[i];
    await prisma.night.create({
      data: {
        tripId: trip.id,
        order: i,
        date: day(41 + i),
        location: n.loc,
        notes: n.hotel ? null : "Nothing held yet — Komaneka quoted but not confirmed.",
        hotels: n.hotel
          ? {
              create: {
                hotelName: n.hotel,
                rooms: 5,
                cost: 138000 + i * 4000, // 5 rooms a night
                status: n.status!,
                holdUntil: n.hold ? day(n.hold) : null,
                source: "Direct",
                confirmationNo: n.status === "final" ? `NJ-BALI-${310 + i}` : null,
              },
            }
          : undefined,
      },
    });
  }

  const rows = [
    { who: "Aditya Bansal", pax: 2, variant: std, upsells: ["Uluwatu sunset & Kecak dance"], paidPct: 1, visa: "not_required" },
    { who: "Farah Qureshi", pax: 4, variant: deluxe, upsells: ["Nusa Penida day trip", "Uluwatu sunset & Kecak dance"], paidPct: 0.25, visa: "not_required", note: "Connecting room requested. Children aged 7 and 11." },
    { who: "Vikram Rao", pax: 2, variant: std, upsells: [] as string[], paidPct: 0.25, visa: "held" },
    { who: "Ananya Ghosh", pax: 3, variant: deluxe, upsells: ["Nusa Penida day trip"], paidPct: 0, visa: "not_required", note: "Corporate booking — invoice to company GSTIN." },
    { who: "Imran Shaikh", pax: 2, variant: std, upsells: [] as string[], paidPct: 0.5, visa: "not_required" },
  ];

  for (const r of rows) {
    const inclTaxPP = r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.sellContribution || 0), 0);
    const inclCostPP = DEFAULT_COST_PP + r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.cost || 0), 0);
    const money = {
      pax: r.pax,
      landAmount: r.variant.sellPrice * r.pax,
      inclTaxPP,
      gstRate: 5,
      tcsRate: 2,
    };
    const total = totalOf(money);

    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        variantId: r.variant.id,
        customerId: customers[r.who],
        customerName: r.who,
        customerPhone: phoneOf(r.who),
        packageType: "land",
        ...money,
        inclCostPP,
        status: "confirmed",
        visaStatus: r.visa,
        visaHandledBy: r.visa === "held" ? "self" : null,
        visaValidUntil: r.visa === "held" ? day(400) : null,
        notes: r.note || null,
        refundPolicy: POLICY,
        freeCancelUntil: day(41 - 45),
      },
    });

    for (const i of incl.filter((x) => x.isDefault || r.upsells.includes(x.name))) {
      await prisma.bookingInclusion.create({
        data: { bookingId: booking.id, inclusionId: inclIds[i.name], name: i.name, cost: i.cost, charge: i.isDefault ? 0 : i.sellContribution, isDefault: i.isDefault, bookedAt: day(-40) },
      });
    }

    // The standard plan, applied: 25% at booking, balance 21 days out.
    const first = round500(total * 0.25);
    await prisma.paymentScheduleItem.createMany({
      data: [
        { bookingId: booking.id, label: "Booking amount", amount: first, dueDate: day(-38), order: 0 },
        { bookingId: booking.id, label: "Balance", amount: total - first, dueDate: day(41 - 21), order: 1 },
      ],
    });

    // Ananya has paid nothing, so her booking amount is already overdue —
    // which is exactly the row the Payments screen should be shouting about.
    const paid = round500(total * r.paidPct);
    if (paid > 0) {
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: paid, date: day(-36), mode: "upi", note: r.paidPct === 1 ? "Paid in full" : "Booking amount" },
      });
    }
  }

  // A customer uploaded proof of payment; it isn't money until you approve it.
  const ananya = await prisma.booking.findFirst({ where: { tripId: trip.id, customerName: "Ananya Ghosh" } });
  await prisma.pendingPayment.create({
    data: {
      bookingId: ananya?.id,
      tripId: trip.id,
      amount: 96000,
      mode: "bank",
      date: day(-1),
      reference: "UTR9930481277",
      payerName: "Ananya Ghosh",
      note: "Submitted through the payment link — approve it to add it to her balance.",
    },
  });

  await prisma.expense.createMany({
    data: [
      { orgId, tripId: trip.id, date: day(-30), category: "hotel", payee: "The Legian Seminyak", amount: 276000, status: "paid", paymentMode: "card", bankName: "ICICI Bank", notes: "2 nights, 5 rooms, prepaid" },
      { orgId, tripId: trip.id, date: day(-9), category: "hotel", payee: "Sofitel Bali", amount: 152000, status: "pending", notes: "Deposit invoice — due before the hold lapses" },
      { orgId, tripId: trip.id, date: day(-12), category: "transport", payee: "Bali Prima Transport", amount: 68000, status: "pending", notes: "Invoice received, not yet paid" },
      { orgId, tripId: trip.id, date: day(-6), category: "misc", payee: "Canva Pro", amount: 4200, status: "paid", paymentMode: "card", bankName: "ICICI Bank", notes: "Itinerary artwork" },
    ],
  });

  console.log("· trip 2 — Bali (live, money due)");
}

// ===========================================================================
// TRIP 3 — three months out and still filling. Enquiries, deposits, visas in
// progress, everything on hold. The pipeline trip.
// ===========================================================================
async function seedVietnam(orgId: string, customers: Record<string, string>) {
  const departure = day(89);
  const trip = await prisma.trip.create({
    data: {
      orgId,
      name: "Vietnam Discovery — Group Departure",
      destination: "Vietnam",
      nights: 7,
      days: 8,
      departureDate: departure,
      endDate: day(96),
      capacity: 20,
      maxPerRoom: 2,
      notes:
        "FILLING UP — three months out. 7 of 20 seats sold, two more enquiries open. " +
        "Every hotel is on hold rather than confirmed, and the Visa desk is mid-flight: " +
        "some applicants are still uploading documents, one is already submitted.",
    },
  });

  const twin = await prisma.variant.create({ data: { tripId: trip.id, name: "Twin share", sellPrice: 62000, occupancy: "twin share" } });
  await prisma.variant.create({ data: { tripId: trip.id, name: "Single occupancy", sellPrice: 79000, occupancy: "single" } });

  const incl = [
    // Both the hotels and the Halong cruise are nights on the itinerary, so
    // they carry no per-person cost here.
    { name: "Hotels as per itinerary", category: "hotel", isDefault: true, cost: 0, sellContribution: 0 },
    { name: "Halong Bay overnight cruise", category: "tour", isDefault: true, cost: 0, sellContribution: 0 },
    { name: "Breakfast daily + 3 dinners", category: "meal", isDefault: true, cost: 3800, sellContribution: 0 },
    { name: "All internal transfers", category: "transfer", isDefault: true, cost: 5500, sellContribution: 0 },
    { name: "Cu Chi tunnels half-day", category: "tour", isDefault: false, cost: 2800, sellContribution: 4500 },
    { name: "Hoi An cooking class", category: "tour", isDefault: false, cost: 3200, sellContribution: 5000 },
  ];
  const inclIds: Record<string, string> = {};
  for (const i of incl) {
    const row = await prisma.inclusion.create({ data: { tripId: trip.id, ...i } });
    inclIds[i.name] = row.id;
  }
  const DEFAULT_COST_PP = 3800 + 5500;

  const stops = ["Hanoi", "Hanoi", "Halong Bay", "Da Nang", "Da Nang", "Hoi An", "Hoi An"];
  const hotels = ["Hotel de l'Opera", "Hotel de l'Opera", "Paradise Elegance Cruise", "Danang Golden Bay", "Danang Golden Bay", "Anantara Hoi An", "Anantara Hoi An"];
  for (let i = 0; i < stops.length; i++) {
    await prisma.night.create({
      data: {
        tripId: trip.id,
        order: i,
        date: day(89 + i),
        location: stops[i],
        hotels: { create: { hotelName: hotels[i], rooms: 5, cost: 58000 + i * 2000, status: "hold", holdUntil: day(20 + i), source: "Agoda" } },
      },
    });
  }

  const rows = [
    { who: "Divya Menon", pax: 2, upsells: ["Hoi An cooking class"], status: "confirmed", paidPct: 0.25, visa: "submitted" },
    { who: "Nikhil Joshi", pax: 3, upsells: ["Cu Chi tunnels half-day"], status: "confirmed", paidPct: 0.25, visa: "initiated" },
    { who: "Rohan Sharma", pax: 2, upsells: [] as string[], status: "confirmed", paidPct: 0.25, visa: "required", note: "Returning client — travelled to Iceland with us in June." },
    { who: "Tara Suri", pax: 2, upsells: [] as string[], status: "enquiry", paidPct: 0, visa: "required", note: "Waiting on her husband's leave approval. Follow up next week." },
    { who: "Meera Iyer", pax: 1, upsells: ["Hoi An cooking class"], status: "enquiry", paidPct: 0, visa: "required" },
  ];

  for (const r of rows) {
    const inclTaxPP = r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.sellContribution || 0), 0);
    const inclCostPP = DEFAULT_COST_PP + r.upsells.reduce((s, n) => s + (incl.find((i) => i.name === n)?.cost || 0), 0);
    const money = { pax: r.pax, landAmount: 62000 * r.pax, visaAmount: 3500 * r.pax, inclTaxPP, gstRate: 5, tcsRate: 2 };
    const total = totalOf(money);

    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        variantId: twin.id,
        customerId: customers[r.who],
        customerName: r.who,
        customerPhone: phoneOf(r.who),
        packageType: "lva",
        ...money,
        inclCostPP,
        status: r.status,
        visaStatus: r.visa,
        visaHandledBy: "us",
        notes: r.note || null,
        refundPolicy: POLICY,
        freeCancelUntil: day(89 - 45),
      },
    });

    for (const i of incl.filter((x) => x.isDefault || r.upsells.includes(x.name))) {
      await prisma.bookingInclusion.create({
        data: { bookingId: booking.id, inclusionId: inclIds[i.name], name: i.name, cost: i.cost, charge: i.isDefault ? 0 : i.sellContribution, isDefault: i.isDefault, bookedAt: day(-10) },
      });
    }

    if (r.status === "confirmed") {
      const first = round500(total * 0.25);
      await prisma.paymentScheduleItem.createMany({
        data: [
          { bookingId: booking.id, label: "Booking amount", amount: first, dueDate: day(-8), order: 0 },
          { bookingId: booking.id, label: "Balance", amount: total - first, dueDate: day(89 - 21), order: 1 },
        ],
      });
      if (r.paidPct > 0) {
        await prisma.payment.create({ data: { bookingId: booking.id, amount: round500(total * r.paidPct), date: day(-8), mode: "upi", note: "Booking amount" } });
      }
    }
  }

  // Travellers on one booking, to show the per-person breakdown.
  const nikhil = await prisma.booking.findFirst({ where: { tripId: trip.id, customerName: "Nikhil Joshi" } });
  if (nikhil) {
    await prisma.traveller.createMany({
      data: [
        { bookingId: nikhil.id, name: "Nikhil Joshi", age: 41 },
        { bookingId: nikhil.id, name: "Shruti Joshi", age: 38 },
        { bookingId: nikhil.id, name: "Aarav Joshi", age: 9 },
      ],
    });
  }

  // Visa desk — the same people, at different stages of paperwork.
  await prisma.visaApplicant.createMany({
    data: [
      { tripId: trip.id, fullName: "Divya Menon", givenName: "Divya", surname: "Menon", nationality: "Indian", passportNo: "Z4471982", passportExpiry: day(900), phone: "+919846223311", email: "divya.menon@example.com", employmentType: "employed", occupation: "Product designer", employer: "Zeta Labs", status: "submitted", appointmentAt: day(-3), visaType: "generic", visaCountry: "Vietnam" },
      { tripId: trip.id, fullName: "Rahul Menon", givenName: "Rahul", surname: "Menon", nationality: "Indian", passportNo: "Z4471983", passportExpiry: day(870), status: "submitted", appointmentAt: day(-3), visaType: "generic", visaCountry: "Vietnam" },
      { tripId: trip.id, fullName: "Nikhil Joshi", givenName: "Nikhil", surname: "Joshi", nationality: "Indian", passportNo: "R8829104", passportExpiry: day(1200), phone: "+919921334455", employmentType: "business", occupation: "Proprietor", status: "ready", visaType: "generic", visaCountry: "Vietnam" },
      { tripId: trip.id, fullName: "Shruti Joshi", givenName: "Shruti", surname: "Joshi", nationality: "Indian", status: "collecting", visaType: "generic", visaCountry: "Vietnam" },
      { tripId: trip.id, fullName: "Aarav Joshi", givenName: "Aarav", surname: "Joshi", nationality: "Indian", status: "collecting", notes: "Minor — needs both parents' consent letter.", visaType: "generic", visaCountry: "Vietnam" },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { orgId, tripId: trip.id, date: day(-15), category: "marketing", payee: "Meta Ads", amount: 28000, status: "paid", paymentMode: "card", bankName: "ICICI Bank", notes: "Group departure campaign" },
      { orgId, tripId: trip.id, date: day(-4), category: "hotel", payee: "Agoda", amount: 42000, status: "paid", paymentMode: "card", bankName: "ICICI Bank", notes: "Hold deposit, Hanoi" },
    ],
  });

  console.log("· trip 3 — Vietnam (filling up)");
}

// ===========================================================================
// Running the business, not any one trip: overheads and a bespoke enquiry.
// ===========================================================================
async function seedOverheads(orgId: string) {
  await prisma.expense.createMany({
    data: [
      { orgId, date: day(-31), category: "salary", payee: "Payroll — July", amount: 185000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank" },
      { orgId, date: day(-31), category: "office", payee: "Andheri office rent", amount: 65000, status: "paid", paymentMode: "bank", bankName: "HDFC Bank" },
      { orgId, date: day(-25), category: "software", payee: "TripZei subscription", amount: 4999, status: "paid", paymentMode: "card", bankName: "ICICI Bank" },
      { orgId, date: day(-18), category: "marketing", payee: "Instagram creator collab", amount: 45000, status: "paid", paymentMode: "upi", bankName: "HDFC Bank" },
      { orgId, date: day(-2), category: "office", payee: "Airtel broadband", amount: 2360, status: "pending" },
    ],
  });

  const c = await prisma.customer.findFirst({ where: { orgId, name: "Ananya Ghosh" } });
  await prisma.customTrip.create({
    data: {
      orgId,
      customerId: c?.id,
      clientName: "Ananya Ghosh",
      clientPhone: "+919830778899",
      title: "Anniversary trip — Kyoto & Tokyo",
      startDate: day(150),
      endDate: day(160),
      status: "enquiry",
      gstRate: 5,
      tcsRate: 2,
      notes: "Bespoke, not a group departure. Priced line by line — this is the Custom trips module.",
      items: {
        create: [
          { type: "flight", description: "BOM–HND return, Japan Airlines", supplier: "JAL", qty: 2, cost: 78000, sell: 86000 },
          { type: "hotel", description: "Hotel The Celestine Kyoto, 5 nights", supplier: "Direct", qty: 2, cost: 62000, sell: 74000 },
          { type: "hotel", description: "Park Hotel Tokyo, 4 nights", supplier: "Agoda", qty: 2, cost: 48000, sell: 58000 },
          { type: "rail", description: "JR Pass, 7 days", supplier: "JR Central", qty: 2, cost: 24000, sell: 27500 },
          { type: "activity", description: "Private tea ceremony, Gion", supplier: "Camellia", qty: 2, cost: 6500, sell: 9500 },
        ],
      },
    },
  });

  console.log("· overheads + one custom trip");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
