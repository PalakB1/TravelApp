"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseAmount } from "@/lib/money";

async function guard() {
  const s = await getSession();
  if (!s) redirect("/login");
}

function refresh() {
  revalidatePath("/", "layout");
}

// Match an existing customer by name (case-insensitive) or create one.
// SQLite's `=` is case-sensitive, so we fall back to a scan to avoid duplicates.
export async function matchCustomer(name: string) {
  const trimmed = name.trim();
  const exact = await prisma.customer.findFirst({ where: { name: trimmed } });
  if (exact) return exact;
  const all = await prisma.customer.findMany();
  return all.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null;
}

async function findOrCreateCustomer(name: string, phone: string | null) {
  const existing = await matchCustomer(name);
  if (existing) {
    if (phone && !existing.phone) {
      return prisma.customer.update({ where: { id: existing.id }, data: { phone } });
    }
    return existing;
  }
  return prisma.customer.create({ data: { name: name.trim(), phone: phone || undefined } });
}

export async function updateCustomer(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      name: name || undefined,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  // keep the denormalised name/phone on this customer's bookings in sync
  if (name) {
    await prisma.booking.updateMany({ where: { customerId: id }, data: { customerName: updated.name } });
  }
  refresh();
}

export async function deleteCustomer(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  // Unlink any bookings (keep their history + denormalised name), then remove the customer.
  await prisma.booking.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await prisma.customer.delete({ where: { id } });
  refresh();
  redirect("/customers");
}

// ---- Trips ----
export async function createTrip(formData: FormData) {
  await guard();
  const name = String(formData.get("name") || "").trim();
  const destination = String(formData.get("destination") || "").trim();
  if (!name) return;
  const dateStr = String(formData.get("departureDate") || "");
  const endStr = String(formData.get("endDate") || "");
  const trip = await prisma.trip.create({
    data: {
      name,
      destination,
      nights: Number(formData.get("nights")) || 0,
      days: Number(formData.get("days")) || 0,
      capacity: Number(formData.get("capacity")) || 0,
      maxPerRoom: Math.max(1, Number(formData.get("maxPerRoom")) || 2),
      departureDate: dateStr ? new Date(dateStr) : null,
      endDate: endStr ? new Date(endStr) : null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
  redirect(`/trips/${trip.id}`);
}

export async function deleteTrip(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  await prisma.trip.delete({ where: { id } });
  refresh();
  redirect("/trips");
}

export async function updateTripRooms(formData: FormData) {
  await guard();
  await prisma.trip.update({
    where: { id: String(formData.get("id")) },
    data: { maxPerRoom: Math.max(1, Number(formData.get("maxPerRoom")) || 3) },
  });
  refresh();
}

// Clone a trip's itinerary/cars/pricing onto fresh dates. Bookings are NOT copied.
export async function duplicateTrip(formData: FormData) {
  await guard();
  const sourceId = String(formData.get("id"));
  const newName = String(formData.get("name") || "").trim();
  const newDeparture = toDate(formData.get("departureDate"));

  const src = await prisma.trip.findUnique({
    where: { id: sourceId },
    include: { itinerary: { orderBy: { order: "asc" }, include: { hotels: true } }, cars: true, variants: true, inclusions: true, vendorBookings: true },
  });
  if (!src) return;

  // Figure out how far to shift every date.
  const DAY = 864e5;
  const datedNights = src.itinerary.filter((n) => n.date).map((n) => n.date as Date);
  const anchor = src.departureDate ?? (datedNights.length ? datedNights.reduce((a, b) => (a < b ? a : b)) : null);
  let offsetDays = 0;
  if (newDeparture && anchor) {
    offsetDays = Math.round((newDeparture.getTime() - new Date(anchor).getTime()) / DAY);
  }
  const shift = (d: Date | null) => (offsetDays && d ? new Date(new Date(d).getTime() + offsetDays * DAY) : d);

  const created = await prisma.trip.create({
    data: {
      name: newName || `${src.name} (copy)`,
      destination: src.destination,
      nights: src.nights,
      days: src.days,
      capacity: src.capacity,
      notes: src.notes,
      departureDate: newDeparture ?? shift(src.departureDate),
      endDate: shift(src.endDate),
      itinerary: {
        create: src.itinerary.map((n) => ({
          order: n.order,
          date: shift(n.date),
          location: n.location,
          notes: n.notes,
          // keep the planned hotels, but reset each to "unbooked" for the new departure
          hotels: {
            create: n.hotels.map((h) => ({
              hotelName: h.hotelName,
              rooms: h.rooms,
              cost: h.cost,
              status: "unbooked",
              holdUntil: null,
              source: null,
              confirmationNo: null,
            })),
          },
        })),
      },
      cars: {
        create: src.cars.map((c) => ({
          label: c.label,
          carType: c.carType,
          seats: c.seats,
          vendor: c.vendor,
          startDate: shift(c.startDate),
          endDate: shift(c.endDate),
          rentalCost: c.rentalCost,
          driverMode: c.driverMode,
          driverCost: c.driverCost,
          driverNeedsStay: c.driverNeedsStay,
          status: "hold",
          holdUntil: null,
          source: null,
          confirmationNo: null,
        })),
      },
      variants: { create: src.variants.map((v) => ({ name: v.name, sellPrice: v.sellPrice, occupancy: v.occupancy })) },
      inclusions: {
        create: src.inclusions.map((i) => ({ name: i.name, category: i.category, sellContribution: i.sellContribution, cost: i.cost, perPax: i.perPax })),
      },
      vendorBookings: {
        create: src.vendorBookings.map((vb) => ({ type: vb.type, vendorName: vb.vendorName, detail: vb.detail, cost: vb.cost, status: "pending", confirmationNo: null })),
      },
    },
  });

  refresh();
  redirect(`/trips/${created.id}`);
}

// ---- Variants ----
export async function addVariant(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.variant.create({
    data: {
      tripId,
      name,
      sellPrice: parseAmount(String(formData.get("sellPrice"))),
      occupancy: String(formData.get("occupancy") || "") || null,
    },
  });
  refresh();
}

export async function deleteVariant(formData: FormData) {
  await guard();
  await prisma.variant.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Inclusions ----
export async function addInclusion(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.inclusion.create({
    data: {
      tripId,
      name,
      category: String(formData.get("category") || "other"),
      sellContribution: parseAmount(String(formData.get("sellContribution"))),
      cost: parseAmount(String(formData.get("cost"))),
      perPax: String(formData.get("perPax")) !== "flat",
    },
  });
  refresh();
}

export async function deleteInclusion(formData: FormData) {
  await guard();
  await prisma.inclusion.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Vendor bookings (hotels, cars...) ----
export async function addVendorBooking(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const vendorName = String(formData.get("vendorName") || "").trim();
  if (!vendorName) return;
  const dateStr = String(formData.get("date") || "");
  const actualStr = String(formData.get("actualCost") || "").trim();
  await prisma.vendorBooking.create({
    data: {
      tripId,
      type: String(formData.get("type") || "activity"),
      vendorName,
      detail: String(formData.get("detail") || "") || null,
      cost: parseAmount(String(formData.get("cost"))),
      actualCost: actualStr ? parseAmount(actualStr) : null,
      status: String(formData.get("status") || "pending"),
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
      date: dateStr ? new Date(dateStr) : null,
    },
  });
  refresh();
}

// Update an extra — set its status, planned cost, and actual (post-trip) cost.
export async function updateVendorBooking(formData: FormData) {
  await guard();
  const actualStr = String(formData.get("actualCost") || "").trim();
  await prisma.vendorBooking.update({
    where: { id: String(formData.get("id")) },
    data: {
      status: String(formData.get("status")),
      cost: parseAmount(String(formData.get("cost"))),
      actualCost: actualStr ? parseAmount(actualStr) : null,
    },
  });
  refresh();
}

export async function deleteVendorBooking(formData: FormData) {
  await guard();
  await prisma.vendorBooking.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Bookings ----
export async function addBooking(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const customerName = String(formData.get("customerName") || "").trim();
  if (!tripId || !customerName) return;
  const variantId = String(formData.get("variantId") || "") || null;
  const phone = String(formData.get("customerPhone") || "") || null;
  const customer = await findOrCreateCustomer(customerName, phone);
  await prisma.booking.create({
    data: {
      tripId,
      variantId,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: phone || customer.phone,
      pax: Number(formData.get("pax")) || 1,
      packageType: String(formData.get("packageType") || "land"),
      landAmount: parseAmount(String(formData.get("landAmount"))),
      visaAmount: parseAmount(String(formData.get("visaAmount"))),
      flightAmount: parseAmount(String(formData.get("flightAmount"))),
      nonTaxable: parseAmount(String(formData.get("nonTaxable"))),
      gstRate: gstRateFrom(formData.get("gstRate")),
      tcsRate: tcsRateFrom(formData.get("tcsRate")),
      discount: parseAmount(String(formData.get("discount"))),
      discountReason: String(formData.get("discountReason") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      status: String(formData.get("status") || "confirmed"),
    },
  });
  refresh();
}

function gstRateFrom(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim();
  return s === "" ? 5 : Math.max(0, Number(s) || 0);
}
function tcsRateFrom(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim();
  return s === "" ? 2 : Math.max(0, Number(s) || 0);
}

export async function updateBookingInvoice(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  await prisma.booking.update({
    where: { id },
    data: {
      customerName: String(formData.get("customerName") || "").trim() || undefined,
      customerPhone: String(formData.get("customerPhone") || "") || null,
      pax: Number(formData.get("pax")) || 1,
      packageType: String(formData.get("packageType") || "land"),
      landAmount: parseAmount(String(formData.get("landAmount"))),
      visaAmount: parseAmount(String(formData.get("visaAmount"))),
      flightAmount: parseAmount(String(formData.get("flightAmount"))),
      nonTaxable: parseAmount(String(formData.get("nonTaxable"))),
      gstRate: gstRateFrom(formData.get("gstRate")),
      tcsRate: tcsRateFrom(formData.get("tcsRate")),
      discount: parseAmount(String(formData.get("discount"))),
      discountReason: String(formData.get("discountReason") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
}

export async function setBookingStatus(formData: FormData) {
  await guard();
  await prisma.booking.update({
    where: { id: String(formData.get("id")) },
    data: { status: String(formData.get("status")) },
  });
  refresh();
}

export async function deleteBooking(formData: FormData) {
  await guard();
  await prisma.booking.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Itinerary nights (hotels per date) ----
function toDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v || "");
  return s ? new Date(s) : null;
}

export async function addNight(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const location = String(formData.get("location") || "").trim();
  if (!tripId || !location) return;
  const count = await prisma.night.count({ where: { tripId } });
  const hotelName = String(formData.get("hotelName") || "").trim();
  await prisma.night.create({
    data: {
      tripId,
      location,
      order: count,
      date: toDate(formData.get("date")),
      // optionally seed the first hotel from the same form
      hotels: hotelName
        ? { create: [{ hotelName, rooms: Number(formData.get("rooms")) || 0, cost: parseAmount(String(formData.get("cost"))), status: String(formData.get("status") || "hold") }] }
        : undefined,
    },
  });
  refresh();
}

export async function updateNight(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  await prisma.night.update({
    where: { id },
    data: {
      location: String(formData.get("location") || "").trim() || undefined,
      date: toDate(formData.get("date")),
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
}

export async function deleteNight(formData: FormData) {
  await guard();
  await prisma.night.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Hotel bookings (a night can have several) ----
export async function addHotelBooking(formData: FormData) {
  await guard();
  const nightId = String(formData.get("nightId"));
  const hotelName = String(formData.get("hotelName") || "").trim();
  if (!nightId || !hotelName) return;
  await prisma.hotelBooking.create({
    data: {
      nightId,
      hotelName,
      rooms: Number(formData.get("rooms")) || 0,
      cost: parseAmount(String(formData.get("cost"))),
      status: String(formData.get("status") || "hold"),
      holdUntil: toDate(formData.get("holdUntil")),
      source: String(formData.get("source") || "") || null,
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
}

export async function updateHotelBooking(formData: FormData) {
  await guard();
  await prisma.hotelBooking.update({
    where: { id: String(formData.get("id")) },
    data: {
      hotelName: String(formData.get("hotelName") || "").trim() || undefined,
      rooms: Number(formData.get("rooms")) || 0,
      cost: parseAmount(String(formData.get("cost"))),
      status: String(formData.get("status") || "hold"),
      holdUntil: toDate(formData.get("holdUntil")),
      source: String(formData.get("source") || "") || null,
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
}

export async function deleteHotelBooking(formData: FormData) {
  await guard();
  await prisma.hotelBooking.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Cars ----
export async function addCar(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  if (!tripId) return;
  const count = await prisma.car.count({ where: { tripId } });
  await prisma.car.create({
    data: {
      tripId,
      label: String(formData.get("label") || "") || `Car ${count + 1}`,
      carType: String(formData.get("carType") || "") || null,
      seats: Number(formData.get("seats")) || 0,
      vendor: String(formData.get("vendor") || "") || null,
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      rentalCost: parseAmount(String(formData.get("rentalCost"))),
      driverMode: String(formData.get("driverMode") || "self"),
      driverCost: parseAmount(String(formData.get("driverCost"))),
      driverNeedsStay: String(formData.get("driverNeedsStay")) === "yes",
      status: String(formData.get("status") || "hold"),
      holdUntil: toDate(formData.get("holdUntil")),
      source: String(formData.get("source") || "") || null,
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
    },
  });
  refresh();
}

export async function updateCar(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  await prisma.car.update({
    where: { id },
    data: {
      carType: String(formData.get("carType") || "") || null,
      seats: Number(formData.get("seats")) || 0,
      vendor: String(formData.get("vendor") || "") || null,
      rentalCost: parseAmount(String(formData.get("rentalCost"))),
      driverMode: String(formData.get("driverMode") || "self"),
      driverCost: parseAmount(String(formData.get("driverCost"))),
      driverNeedsStay: String(formData.get("driverNeedsStay")) === "yes",
      status: String(formData.get("status") || "hold"),
      holdUntil: toDate(formData.get("holdUntil")),
      source: String(formData.get("source") || "") || null,
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
    },
  });
  refresh();
}

export async function deleteCar(formData: FormData) {
  await guard();
  await prisma.car.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- GST/TCS remittance ----
export async function setTaxRemitted(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const remit = String(formData.get("remit")) === "1";
  await prisma.booking.update({
    where: { id },
    data: {
      taxRemitted: remit,
      taxRemittedOn: remit ? new Date() : null,
      taxRemittedNote: remit ? String(formData.get("note") || "") || null : null,
    },
  });
  refresh();
}

// Tag the selected bookings as remitted (when you pay the government for a period).
export async function markTaxRemittedBulk(formData: FormData) {
  await guard();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const dateStr = String(formData.get("date") || "");
  await prisma.booking.updateMany({
    where: { id: { in: ids } },
    data: {
      taxRemitted: true,
      taxRemittedOn: dateStr ? new Date(dateStr) : new Date(),
      taxRemittedNote: String(formData.get("note") || "") || null,
    },
  });
  refresh();
}

// ---- Travellers (people on a booking) ----
export async function addTraveller(formData: FormData) {
  await guard();
  const bookingId = String(formData.get("bookingId"));
  const name = String(formData.get("name") || "").trim();
  if (!bookingId || !name) return;
  const ageStr = String(formData.get("age") || "").trim();
  await prisma.traveller.create({
    data: { bookingId, name, age: ageStr ? Number(ageStr) || null : null },
  });
  refresh();
}

export async function updateTraveller(formData: FormData) {
  await guard();
  const ageStr = String(formData.get("age") || "").trim();
  await prisma.traveller.update({
    where: { id: String(formData.get("id")) },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      age: ageStr ? Number(ageStr) || null : null,
    },
  });
  refresh();
}

export async function deleteTraveller(formData: FormData) {
  await guard();
  await prisma.traveller.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// ---- Payments ----
export async function addPayment(formData: FormData) {
  await guard();
  const bookingId = String(formData.get("bookingId"));
  const amount = parseAmount(String(formData.get("amount")));
  if (!bookingId || amount <= 0) return;
  const dateStr = String(formData.get("date") || "");
  await prisma.payment.create({
    data: {
      bookingId,
      amount,
      mode: String(formData.get("mode") || "upi"),
      note: String(formData.get("note") || "") || null,
      date: dateStr ? new Date(dateStr) : new Date(),
    },
  });
  refresh();
}

export async function deletePayment(formData: FormData) {
  await guard();
  await prisma.payment.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}
