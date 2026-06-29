import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Login account — change the password after first login
  const email = "admin@travel.local";
  const passwordHash = await bcrypt.hash("travel123", 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Owner", passwordHash },
  });

  // Demo trips only seed when explicitly asked (SEED_DEMO=1) — keeps real data safe.
  const DEMO = process.env.SEED_DEMO === "1";

  // Sample trip so the dashboard isn't empty on first run
  const existing = await prisma.trip.findFirst({ where: { name: "Bali Escape" } });
  if (DEMO && !existing) {
    const trip = await prisma.trip.create({
      data: {
        name: "Bali Escape",
        destination: "Bali, Indonesia",
        nights: 6,
        days: 7,
        departureDate: new Date("2026-10-12"),
        endDate: new Date("2026-10-18"),
        capacity: 20,
        notes: "Sample trip — edit or delete anytime.",
        variants: {
          create: [
            { name: "Deluxe", sellPrice: 65000, occupancy: "twin share" },
            { name: "Standard", sellPrice: 52000, occupancy: "twin share" },
          ],
        },
        inclusions: {
          create: [
            { name: "4-star hotel", category: "hotel", sellContribution: 20000, cost: 12000 },
            { name: "Return flights", category: "flight", sellContribution: 24000, cost: 18000 },
            { name: "Airport transfers", category: "transfer", sellContribution: 4000, cost: 2500 },
            { name: "Day tours", category: "tour", sellContribution: 9000, cost: 6000 },
          ],
        },
      },
      include: { variants: true },
    });

    const deluxe = trip.variants.find((v) => v.name === "Deluxe")!;
    const riya = await prisma.customer.create({ data: { name: "Riya Sharma", phone: "98765 43210", email: "riya@example.com" } });
    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        variantId: deluxe.id,
        customerId: riya.id,
        customerName: riya.name,
        customerPhone: riya.phone,
        pax: 2,
        discount: 5000,
        discountReason: "Festive offer",
        status: "confirmed",
        payments: {
          create: [{ amount: 40000, mode: "upi", note: "Advance" }],
        },
        travellers: {
          create: [
            { name: "Riya Sharma", age: 31 },
            { name: "Aarav Sharma", age: 8 },
          ],
        },
      },
    });

    await prisma.vendorBooking.createMany({
      data: [
        { tripId: trip.id, type: "hotel", vendorName: "The Anvaya Beach Resort", detail: "2 deluxe rooms, 6 nights", cost: 96000, status: "confirmed", confirmationNo: "ANV-88213" },
        { tripId: trip.id, type: "car", vendorName: "Bali Cabs", detail: "Private SUV, full trip", cost: 18000, status: "pending" },
      ],
    });

    console.log("Seeded sample trip with booking", booking.id);
  }

  // Sample SELF-DRIVE trip — shows itinerary gaps, holds, and the car fleet
  const iceland = await prisma.trip.findFirst({ where: { name: "Iceland Ring Road" } });
  if (DEMO && !iceland) {
    const soon = (days: number) => new Date(Date.now() + days * 864e5); // for "hold expiring" demo
    const sharma = await prisma.customer.create({ data: { name: "Sharma family", phone: "98100 11122", email: "sharma@example.com" } });
    const mehta = await prisma.customer.create({ data: { name: "Mehta & Roy", phone: "99200 33445" } });
    const trip = await prisma.trip.create({
      data: {
        name: "Iceland Ring Road",
        destination: "Iceland",
        nights: 7,
        days: 8,
        departureDate: new Date("2026-09-12"),
        endDate: new Date("2026-09-19"),
        capacity: 12,
        notes: "Self-drive group. 4 cars.",
        itinerary: {
          create: [
            // Reykjavik night split across TWO hotels (demonstrates multiple hotels per night)
            { order: 0, date: new Date("2026-09-12"), location: "Reykjavik", hotels: { create: [
              { hotelName: "Centerhotel Þingholt", rooms: 4, cost: 120000, status: "final", confirmationNo: "CH-22910" },
              { hotelName: "Kvosin Downtown", rooms: 2, cost: 60000, status: "final", confirmationNo: "KV-7781" },
            ] } },
            { order: 1, date: new Date("2026-09-13"), location: "Selfoss" }, // no hotel = gap
            { order: 2, date: new Date("2026-09-14"), location: "Vík", hotels: { create: [
              { hotelName: "Hotel Vík í Mýrdal", rooms: 6, cost: 165000, status: "hold", holdUntil: soon(1), source: "Booking.com" },
            ] } },
            { order: 3, date: new Date("2026-09-15"), location: "Höfn", hotels: { create: [
              { hotelName: "Fosshotel Vatnajökull", rooms: 6, cost: 190000, status: "final", confirmationNo: "FH-5521" },
            ] } },
            { order: 4, date: new Date("2026-09-16"), location: "Mývatn" }, // no hotel = gap
            { order: 5, date: new Date("2026-09-17"), location: "Akureyri", hotels: { create: [
              { hotelName: "Kea Hotel", rooms: 6, cost: 175000, status: "hold", holdUntil: soon(6), source: "Agoda" },
            ] } },
          ],
        },
        cars: {
          create: [
            { label: "Car 1", carType: "Dacia Duster", vendor: "Blue Car Rental", rentalCost: 95000, driverMode: "self", status: "final" },
            { label: "Car 2", carType: "Dacia Duster", vendor: "Blue Car Rental", rentalCost: 95000, driverMode: "self", status: "final" },
            { label: "Car 3", carType: "Land Cruiser", vendor: "Go Iceland", rentalCost: 140000, driverMode: "hired", driverCost: 110000, status: "final" },
            { label: "Car 4", carType: "Land Cruiser", vendor: "Go Iceland", rentalCost: 140000, driverMode: "hired", driverCost: 110000, status: "hold", holdUntil: soon(2), source: "Go Iceland" },
          ],
        },
        bookings: {
          create: [
            { customerId: sharma.id, customerName: sharma.name, customerPhone: sharma.phone, pax: 4, packageType: "full", landAmount: 1200000, visaAmount: 80000, flightAmount: 320000, status: "confirmed", payments: { create: [{ amount: 500000, mode: "bank", note: "Advance" }] }, travellers: { create: [{ name: "Vikram Sharma", age: 42 }, { name: "Anita Sharma", age: 39 }, { name: "Ishaan Sharma", age: 14 }, { name: "Diya Sharma", age: 9 }] } },
            { customerId: mehta.id, customerName: mehta.name, customerPhone: mehta.phone, pax: 2, packageType: "lva", landAmount: 700000, visaAmount: 100000, nonTaxable: 30000, status: "confirmed", payments: { create: [{ amount: 300000, mode: "upi", note: "Advance" }] }, travellers: { create: [{ name: "Karan Mehta", age: 35 }, { name: "Sara Roy", age: 33 }] } },
          ],
        },
      },
    });
    console.log("Seeded self-drive trip", trip.id);
  }

  console.log("Seed complete. Login: admin@travel.local / travel123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
