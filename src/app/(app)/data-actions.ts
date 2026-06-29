"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseAmount, formatINR } from "@/lib/money";

async function guard() {
  const s = await getSession();
  if (!s) redirect("/login");
}

function refresh() {
  revalidatePath("/", "layout");
}

// Best-effort activity logging — never let a logging failure break a real action.
async function logActivity(category: string, action: string, summary: string, href?: string | null) {
  try {
    await prisma.activityLog.create({ data: { category, action, summary, href: href || null } });
  } catch {
    /* table may not exist yet (pre-migration) — ignore */
  }
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

export async function createCustomer(formData: FormData) {
  await guard();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const existing = await matchCustomer(name);
  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: { phone: phone ?? existing.phone, email: email ?? existing.email },
    });
    refresh();
    redirect(`/customers/${existing.id}`);
  }
  const c = await prisma.customer.create({ data: { name, phone, email } });
  await logActivity("customer", "added", `Added customer ${c.name}${phone ? ` · ${phone}` : ""}`, `/customers/${c.id}`);
  refresh();
  redirect(`/customers/${c.id}`);
}

export async function deleteCustomer(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const cust = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
  // Unlink any bookings (keep their history + denormalised name), then remove the customer.
  await prisma.booking.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await prisma.customer.delete({ where: { id } });
  await logActivity("customer", "deleted", `Deleted customer ${cust?.name ?? ""}`.trim());
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
  await logActivity("trip", "added", `Created trip “${trip.name}”`, `/trips/${trip.id}`);
  refresh();
  redirect(`/trips/${trip.id}`);
}

export async function deleteTrip(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const trip = await prisma.trip.findUnique({ where: { id }, select: { name: true } });
  await prisma.trip.delete({ where: { id } });
  await logActivity("trip", "deleted", `Deleted trip “${trip?.name ?? "trip"}”`);
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
          // Itinerary stops only — hotels are NOT copied; book them fresh for the new dates.
        })),
      },
      variants: { create: src.variants.map((v) => ({ name: v.name, sellPrice: v.sellPrice, occupancy: v.occupancy })) },
      inclusions: {
        create: src.inclusions.map((i) => ({ name: i.name, category: i.category, isDefault: i.isDefault, sellContribution: i.sellContribution, cost: i.cost, taxable: i.taxable, perPax: i.perPax })),
      },
      // Cars and vendor extras are NOT copied — add them for the new departure.
    },
  });

  await logActivity("trip", "added", `Copied “${src.name}” → “${created.name}”`, `/trips/${created.id}`);
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

// ---- Inclusions (trip activities/extras) ----
export async function addInclusion(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const name = String(formData.get("name") || "").trim();
  if (!tripId || !name) return;
  const isDefault = String(formData.get("isDefault")) === "yes";
  await prisma.inclusion.create({
    data: {
      tripId,
      name,
      isDefault,
      cost: parseAmount(String(formData.get("cost"))),
      sellContribution: isDefault ? 0 : parseAmount(String(formData.get("charge"))),
      taxable: String(formData.get("taxable")) === "yes",
    },
  });
  await logActivity("inclusion", "added", `Inclusion “${name}”${isDefault ? " (default)" : ""}`, `/trips/${tripId}`);
  refresh();
}

export async function updateInclusion(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const isDefault = String(formData.get("isDefault")) === "yes";
  await prisma.inclusion.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      isDefault,
      cost: parseAmount(String(formData.get("cost"))),
      sellContribution: isDefault ? 0 : parseAmount(String(formData.get("charge"))),
      taxable: String(formData.get("taxable")) === "yes",
    },
  });
  refresh();
}

export async function deleteInclusion(formData: FormData) {
  await guard();
  await prisma.inclusion.delete({ where: { id: String(formData.get("id")) } });
  refresh();
}

// Recompute the denormalised per-person inclusion sums on a booking.
async function recomputeBookingInclusions(bookingId: string) {
  const sels = await prisma.bookingInclusion.findMany({ where: { bookingId } });
  const inclCostPP = sels.reduce((s, x) => s + x.cost, 0);
  const inclTaxPP = sels.reduce((s, x) => s + (x.taxable ? x.charge : 0), 0);
  const inclNonTaxPP = sels.reduce((s, x) => s + (!x.taxable ? x.charge : 0), 0);
  await prisma.booking.update({ where: { id: bookingId }, data: { inclCostPP, inclTaxPP, inclNonTaxPP } });
}

// Tick / untick an inclusion for a booking. On tick, the current price + date are
// snapshotted; on untick the selection is removed. Customer balance/cost recompute.
export async function toggleBookingInclusion(formData: FormData) {
  await guard();
  const bookingId = String(formData.get("bookingId"));
  const inclusionId = String(formData.get("inclusionId"));
  const on = String(formData.get("on")) === "1";
  if (!bookingId || !inclusionId) return;

  if (on) {
    const incl = await prisma.inclusion.findUnique({ where: { id: inclusionId } });
    if (incl) {
      const existing = await prisma.bookingInclusion.findFirst({ where: { bookingId, inclusionId } });
      if (!existing) {
        await prisma.bookingInclusion.create({
          data: {
            bookingId, inclusionId, name: incl.name, cost: incl.cost,
            charge: incl.isDefault ? 0 : incl.sellContribution, taxable: incl.taxable, isDefault: incl.isDefault,
          },
        });
      }
    }
  } else {
    await prisma.bookingInclusion.deleteMany({ where: { bookingId, inclusionId } });
  }
  await recomputeBookingInclusions(bookingId);
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
  const booking = await prisma.booking.create({
    include: { trip: { select: { name: true } } },
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
  // Auto-attach the trip's default inclusions (cost-only), snapshotting price + date.
  const defaults = await prisma.inclusion.findMany({ where: { tripId, isDefault: true } });
  if (defaults.length) {
    await prisma.bookingInclusion.createMany({
      data: defaults.map((d) => ({ bookingId: booking.id, inclusionId: d.id, name: d.name, cost: d.cost, charge: 0, taxable: d.taxable, isDefault: true })),
    });
    await recomputeBookingInclusions(booking.id);
  }
  await logActivity("booking", "added", `New booking — ${booking.customerName} · ${booking.pax} pax · ${booking.trip.name}`, `/bookings/${booking.id}`);
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
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  const b = await prisma.booking.update({ where: { id }, data: { status } });
  await logActivity("booking", "status", `${b.customerName} → ${status}`, `/bookings/${id}`);
  refresh();
}

export async function deleteBooking(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const b = await prisma.booking.findUnique({ where: { id }, select: { customerName: true } });
  await prisma.booking.delete({ where: { id } });
  await logActivity("booking", "deleted", `Deleted booking — ${b?.customerName ?? ""}`.trim());
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
  const extra = String(formData.get("extra")) === "yes";
  const date = toDate(formData.get("date"));
  const existing = await prisma.night.findMany({ where: { tripId }, select: { order: true, date: true } });

  // Normal nights append to the end. Add-on nights slot in chronologically so a
  // pre-trip night sorts ahead of Day 1 (and reads as Day -1) instead of last.
  let order = existing.length;
  if (extra && date) {
    const orders = existing.map((n) => n.order);
    const minOrder = orders.length ? Math.min(...orders) : 0;
    const maxOrder = orders.length ? Math.max(...orders) : 0;
    const ts = existing.filter((n) => n.date).map((n) => new Date(n.date!).getTime());
    const minT = ts.length ? Math.min(...ts) : null;
    const maxT = ts.length ? Math.max(...ts) : null;
    if (minT != null && date.getTime() < minT) order = minOrder - 1;
    else if (maxT != null && date.getTime() > maxT) order = maxOrder + 1;
    else order = maxOrder + 1;
  }

  const hotelName = String(formData.get("hotelName") || "").trim();
  await prisma.night.create({
    data: {
      tripId,
      location,
      order,
      extra,
      date,
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
  const rooms = Number(formData.get("rooms")) || 0;
  const cost = parseAmount(String(formData.get("cost")));
  await prisma.hotelBooking.create({
    data: {
      nightId,
      hotelName,
      rooms,
      cost,
      status: String(formData.get("status") || "hold"),
      holdUntil: toDate(formData.get("holdUntil")),
      source: String(formData.get("source") || "") || null,
      confirmationNo: String(formData.get("confirmationNo") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  const night = await prisma.night.findUnique({ where: { id: nightId }, include: { trip: { select: { id: true, name: true } } } });
  await logActivity("hotel", "added", `Added “${hotelName}” · ${rooms} room${rooms === 1 ? "" : "s"} · ${formatINR(cost)}${night ? ` — ${night.location} (${night.trip.name})` : ""}`, night ? `/trips/${night.trip.id}` : null);
  refresh();
}

// Book one hotel across a range of nights at once. Each night in
// [checkIn, checkOut) gets its own HotelBooking; the total cost is split evenly.
// Dates outside the existing itinerary are added as new nights, labelled
// "Day X−n" (before the trip) or "Day Y+n" (after it).
export async function addHotelStay(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  const hotelName = String(formData.get("hotelName") || "").trim();
  const checkInStr = String(formData.get("checkIn") || "");
  if (!tripId || !hotelName || !checkInStr) return;

  const DAY = 864e5;
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const checkIn = startOfDay(new Date(checkInStr));
  const checkOutStr = String(formData.get("checkOut") || "");
  const checkOut = checkOutStr ? startOfDay(new Date(checkOutStr)) : new Date(checkIn.getTime() + DAY);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / DAY));

  const rooms = Number(formData.get("rooms")) || 0;
  const totalCost = parseAmount(String(formData.get("cost")));
  const perNight = Math.floor(totalCost / nights);
  const remainder = totalCost - perNight * nights;
  const status = String(formData.get("status") || "hold");
  const holdUntil = toDate(formData.get("holdUntil"));
  const source = String(formData.get("source") || "") || null;

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { itinerary: true } });
  if (!trip) return;
  const nightsList = [...trip.itinerary];
  const dated = nightsList.filter((n) => n.date).map((n) => startOfDay(new Date(n.date!)).getTime());
  const minDate = dated.length ? Math.min(...dated) : null;
  const maxDate = dated.length ? Math.max(...dated) : null;
  // Original itinerary nights, earliest first — used to borrow the location of the nearest day.
  const byDate = nightsList.filter((n) => n.date).sort((a, b) => startOfDay(new Date(a.date!)).getTime() - startOfDay(new Date(b.date!)).getTime());
  const orders = nightsList.map((n) => n.order);
  const minOrder = orders.length ? Math.min(...orders) : 0;
  const maxOrder = orders.length ? Math.max(...orders) : 0;
  const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

  for (let i = 0; i < nights; i++) {
    const d = startOfDay(new Date(checkIn.getTime() + i * DAY));
    let night = nightsList.find((n) => n.date && sameDay(new Date(n.date), d));
    if (!night) {
      let location = "Extra night";
      let order = maxOrder + 1;
      if (minDate != null && d.getTime() < minDate) {
        // Before the trip: same place as the first day, slotted ahead of it.
        const k = Math.round((minDate - d.getTime()) / DAY);
        location = byDate[0]?.location || location;
        order = minOrder - k;
      } else if (maxDate != null && d.getTime() > maxDate) {
        // After the trip: same place as the last day, slotted after it.
        const k = Math.round((d.getTime() - maxDate) / DAY);
        location = byDate[byDate.length - 1]?.location || location;
        order = maxOrder + k;
      } else {
        // A gap inside the trip: take the previous day's location.
        const prev = byDate.filter((n) => startOfDay(new Date(n.date!)).getTime() < d.getTime()).pop();
        location = prev?.location || byDate[0]?.location || location;
        order = (prev?.order ?? minOrder) + 1;
      }
      night = await prisma.night.create({ data: { tripId, date: d, location, order, extra: true } });
      nightsList.push(night);
    }
    await prisma.hotelBooking.create({
      data: { nightId: night.id, hotelName, rooms, cost: perNight + (i === 0 ? remainder : 0), status, holdUntil, source },
    });
  }
  await logActivity("hotel", "added", `Booked “${hotelName}” for ${nights} night${nights === 1 ? "" : "s"} · ${formatINR(totalCost)} — ${trip.name}`, `/trips/${tripId}`);
  refresh();
}

export async function updateHotelBooking(formData: FormData) {
  await guard();
  const updated = await prisma.hotelBooking.update({
    where: { id: String(formData.get("id")) },
    include: { night: { include: { trip: { select: { id: true } } } } },
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
  await logActivity("hotel", "updated", `Updated “${updated.hotelName}” · ${updated.rooms} rooms · ${formatINR(updated.cost)} · ${updated.status}`, `/trips/${updated.night.trip.id}`);
  refresh();
}

export async function deleteHotelBooking(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const h = await prisma.hotelBooking.findUnique({ where: { id }, include: { night: { select: { location: true } } } });
  await prisma.hotelBooking.delete({ where: { id } });
  await logActivity("hotel", "deleted", `Deleted “${h?.hotelName ?? "hotel"}”${h?.night ? ` — ${h.night.location}` : ""}`);
  refresh();
}

// ---- Cars ----
export async function addCar(formData: FormData) {
  await guard();
  const tripId = String(formData.get("tripId"));
  if (!tripId) return;
  const count = await prisma.car.count({ where: { tripId } });
  const car = await prisma.car.create({
    include: { trip: { select: { name: true } } },
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
  await logActivity("car", "added", `Added ${car.label}${car.carType ? ` · ${car.carType}` : ""} — ${car.trip.name}`, `/trips/${tripId}`);
  refresh();
}

export async function updateCar(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const car = await prisma.car.update({
    where: { id },
    include: { trip: { select: { name: true } } },
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
  await logActivity("car", "updated", `Updated ${car.label} — ${car.trip.name}`, `/trips/${car.tripId}`);
  refresh();
}

export async function deleteCar(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const car = await prisma.car.findUnique({ where: { id }, select: { label: true, tripId: true } });
  await prisma.car.delete({ where: { id } });
  await logActivity("car", "deleted", `Removed ${car?.label ?? "car"}`, car ? `/trips/${car.tripId}` : null);
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
  const mode = String(formData.get("mode") || "upi");
  const payment = await prisma.payment.create({
    include: { booking: { select: { customerName: true, id: true } } },
    data: {
      bookingId,
      amount,
      mode,
      note: String(formData.get("note") || "") || null,
      date: dateStr ? new Date(dateStr) : new Date(),
    },
  });
  await logActivity("payment", "added", `${payment.booking.customerName} paid ${formatINR(amount)} (${mode})`, `/bookings/${payment.booking.id}`);
  refresh();
}

export async function deletePayment(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const p = await prisma.payment.findUnique({ where: { id }, include: { booking: { select: { customerName: true } } } });
  await prisma.payment.delete({ where: { id } });
  await logActivity("payment", "deleted", p ? `Removed ${formatINR(p.amount)} payment — ${p.booking.customerName}` : "Removed a payment");
  refresh();
}
