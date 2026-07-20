"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { getScope } from "@/lib/scope";
import { parseAmount, formatINR } from "@/lib/money";
import { financialYear } from "@/lib/invoice";

// Every mutation runs through guard(), which returns the EFFECTIVE org id. All
// reads/writes below are scoped to it so one org can never touch another's data.
async function guard(): Promise<string> {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");
  return ctx.orgId;
}

function refresh() {
  revalidatePath("/", "layout");
}

// Assign a gapless, per-org, per-FY tax-invoice number to a booking (once).
export async function generateInvoice(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const booking = await prisma.booking.findFirst({ where: { id, trip: { orgId } }, select: { id: true, invoiceNo: true } });
  if (!booking || booking.invoiceNo) { refresh(); return; }
  const now = new Date();
  const fy = financialYear(now);
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, legalName: true } });
  const prefix = (org?.legalName || org?.name || "INV").replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "INV";
  const seq = await prisma.invoiceSeq.upsert({
    where: { orgId_fy: { orgId, fy } },
    create: { orgId, fy, lastNo: 1 },
    update: { lastNo: { increment: 1 } },
    select: { lastNo: true },
  });
  const invoiceNo = `${prefix}/${fy}/${String(seq.lastNo).padStart(4, "0")}`;
  await prisma.booking.update({ where: { id }, data: { invoiceNo, invoiceDate: now } });
  await logActivity(orgId, "booking", "status", `Generated tax invoice ${invoiceNo}`, `/invoice/${id}`);
  refresh();
}

// Ownership checks — return the row only if it belongs to this org, else null.
// Child records (booking/night/car/…) are scoped through their trip.
// Owns the trip AND (if the member is trip-restricted) has been granted it.
const ownTrip = async (orgId: string, id: string) => {
  const trip = await prisma.trip.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!trip) return null;
  const s = await getScope();
  if (s?.tripIds && !s.tripIds.includes(id)) return null;
  return trip;
};

// Rename actions (used by the click-to-edit titles).
export async function renameTrip(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const name = String(formData.get("value") || "").trim();
  if (!name || !(await ownTrip(orgId, id))) return;
  await prisma.trip.update({ where: { id }, data: { name } });
  await logActivity(orgId, "trip", "updated", `Renamed trip to “${name}”`, `/trips/${id}`);
  refresh();
}
export async function renameBooking(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const name = String(formData.get("value") || "").trim();
  if (!name) return;
  const owned = await prisma.booking.findFirst({ where: { id, trip: { orgId } }, select: { id: true } });
  if (!owned) return;
  await prisma.booking.update({ where: { id }, data: { customerName: name } });
  await logActivity(orgId, "booking", "updated", `Renamed party to “${name}”`, `/bookings/${id}`);
  refresh();
}
const ownBooking = (orgId: string, id: string) => prisma.booking.findFirst({ where: { id, trip: { orgId } }, select: { id: true } });
const ownNight = (orgId: string, id: string) => prisma.night.findFirst({ where: { id, trip: { orgId } }, select: { id: true } });

// Best-effort activity logging — never let a logging failure break a real action.
// Records WHO did it (and whether it was a platform admin acting inside the org).
export async function logActivity(orgId: string, category: string, action: string, summary: string, href?: string | null) {
  try {
    const ctx = await getOrgContext();
    await prisma.activityLog.create({
      data: {
        orgId,
        category,
        action,
        summary,
        href: href || null,
        userId: ctx?.session.userId ?? null,
        userName: ctx?.session.name ?? null,
        actingAdmin: ctx?.actingOrgId ? true : false,
      },
    });
  } catch {
    /* table/columns may not exist yet (pre-migration) — ignore */
  }
}

// Match an existing customer (in this org) by name (case-insensitive) or return null.
export async function matchCustomer(orgId: string, name: string) {
  const trimmed = name.trim();
  const exact = await prisma.customer.findFirst({ where: { orgId, name: trimmed } });
  if (exact) return exact;
  const all = await prisma.customer.findMany({ where: { orgId } });
  return all.find((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()) ?? null;
}

export async function findOrCreateCustomer(orgId: string, name: string, phone: string | null) {
  const existing = await matchCustomer(orgId, name);
  if (existing) {
    if (phone && !existing.phone) {
      return prisma.customer.update({ where: { id: existing.id }, data: { phone } });
    }
    return existing;
  }
  return prisma.customer.create({ data: { orgId, name: name.trim(), phone: phone || undefined } });
}

export async function updateCustomer(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const owned = await prisma.customer.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!owned) return;
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
  const orgId = await guard();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const existing = await matchCustomer(orgId, name);
  if (existing) {
    await prisma.customer.update({
      where: { id: existing.id },
      data: { phone: phone ?? existing.phone, email: email ?? existing.email },
    });
    refresh();
    redirect(`/customers/${existing.id}`);
  }
  const c = await prisma.customer.create({ data: { orgId, name, phone, email } });
  await logActivity(orgId, "customer", "added", `Added customer ${c.name}${phone ? ` · ${phone}` : ""}`, `/customers/${c.id}`);
  refresh();
  redirect(`/customers/${c.id}`);
}

export async function deleteCustomer(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const cust = await prisma.customer.findFirst({ where: { id, orgId }, select: { name: true } });
  if (!cust) return;
  // Unlink any bookings (keep their history + denormalised name), then remove the customer.
  await prisma.booking.updateMany({ where: { customerId: id }, data: { customerId: null } });
  await prisma.customer.delete({ where: { id } });
  await logActivity(orgId, "customer", "deleted", `Deleted customer ${cust?.name ?? ""}`.trim());
  refresh();
  redirect("/customers");
}

// ---- Trips ----
export async function createTrip(formData: FormData) {
  const orgId = await guard();
  const name = String(formData.get("name") || "").trim();
  const destination = String(formData.get("destination") || "").trim();
  if (!name) return;
  const dateStr = String(formData.get("departureDate") || "");
  const endStr = String(formData.get("endDate") || "");
  const trip = await prisma.trip.create({
    data: {
      orgId,
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
  await logActivity(orgId, "trip", "added", `Created trip “${trip.name}”`, `/trips/${trip.id}`);
  refresh();
  redirect(`/trips/${trip.id}`);
}

export async function deleteTrip(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const trip = await prisma.trip.findFirst({ where: { id, orgId }, select: { name: true } });
  if (!trip) return;
  await prisma.trip.delete({ where: { id } });
  await logActivity(orgId, "trip", "deleted", `Deleted trip “${trip?.name ?? "trip"}”`);
  refresh();
  redirect("/trips");
}

export async function updateTripRooms(formData: FormData) {
  const orgId = await guard();
  await prisma.trip.updateMany({
    where: { id: String(formData.get("id")), orgId },
    data: { maxPerRoom: Math.max(1, Number(formData.get("maxPerRoom")) || 3) },
  });
  refresh();
}

// Clone a trip's itinerary/cars/pricing onto fresh dates. Bookings are NOT copied.
export async function duplicateTrip(formData: FormData) {
  const orgId = await guard();
  const sourceId = String(formData.get("id"));
  const newName = String(formData.get("name") || "").trim();
  const newDeparture = toDate(formData.get("departureDate"));

  const src = await prisma.trip.findFirst({
    where: { id: sourceId, orgId },
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
      orgId,
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

  await logActivity(orgId, "trip", "added", `Copied “${src.name}” → “${created.name}”`, `/trips/${created.id}`);
  refresh();
  redirect(`/trips/${created.id}`);
}

// ---- Variants ----
export async function addVariant(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const name = String(formData.get("name") || "").trim();
  if (!name || !(await ownTrip(orgId, tripId))) return;
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
  const orgId = await guard();
  await prisma.variant.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
  refresh();
}

// ---- Inclusions (trip activities/extras) ----
export async function addInclusion(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const name = String(formData.get("name") || "").trim();
  if (!tripId || !name || !(await ownTrip(orgId, tripId))) return;
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
  await logActivity(orgId, "inclusion", "added", `Inclusion “${name}”${isDefault ? " (default)" : ""}`, `/trips/${tripId}`);
  refresh();
}

export async function updateInclusion(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const isDefault = String(formData.get("isDefault")) === "yes";
  if (!(await prisma.inclusion.findFirst({ where: { id, trip: { orgId } }, select: { id: true } }))) return;
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
  const orgId = await guard();
  await prisma.inclusion.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
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
  const orgId = await guard();
  const bookingId = String(formData.get("bookingId"));
  const inclusionId = String(formData.get("inclusionId"));
  const on = String(formData.get("on")) === "1";
  if (!bookingId || !inclusionId || !(await ownBooking(orgId, bookingId))) return;

  if (on) {
    const incl = await prisma.inclusion.findFirst({ where: { id: inclusionId, trip: { orgId } } });
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
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const vendorName = String(formData.get("vendorName") || "").trim();
  if (!vendorName || !(await ownTrip(orgId, tripId))) return;
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
  const orgId = await guard();
  const actualStr = String(formData.get("actualCost") || "").trim();
  await prisma.vendorBooking.updateMany({
    where: { id: String(formData.get("id")), trip: { orgId } },
    data: {
      status: String(formData.get("status")),
      cost: parseAmount(String(formData.get("cost"))),
      actualCost: actualStr ? parseAmount(actualStr) : null,
    },
  });
  refresh();
}

export async function deleteVendorBooking(formData: FormData) {
  const orgId = await guard();
  await prisma.vendorBooking.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
  refresh();
}

// ---- Bookings ----
export async function addBooking(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const customerName = String(formData.get("customerName") || "").trim();
  if (!tripId || !customerName || !(await ownTrip(orgId, tripId))) return;
  const variantId = String(formData.get("variantId") || "") || null;
  const phone = String(formData.get("customerPhone") || "") || null;
  const customer = await findOrCreateCustomer(orgId, customerName, phone);
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
  // A single-traveller booking IS the customer — seed the traveller automatically.
  if (booking.pax === 1) {
    await prisma.traveller.create({ data: { bookingId: booking.id, name: customer.name } });
  }
  // Auto-attach the trip's default inclusions (cost-only), snapshotting price + date.
  const defaults = await prisma.inclusion.findMany({ where: { tripId, isDefault: true } });
  if (defaults.length) {
    await prisma.bookingInclusion.createMany({
      data: defaults.map((d) => ({ bookingId: booking.id, inclusionId: d.id, name: d.name, cost: d.cost, charge: 0, taxable: d.taxable, isDefault: true })),
    });
    await recomputeBookingInclusions(booking.id);
  }
  await logActivity(orgId, "booking", "added", `New booking — ${booking.customerName} · ${booking.pax} pax · ${booking.trip.name}`, `/bookings/${booking.id}`);
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
  const orgId = await guard();
  const id = String(formData.get("id"));
  if (!(await ownBooking(orgId, id))) return;
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
  const orgId = await guard();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!(await ownBooking(orgId, id))) return;
  const b = await prisma.booking.update({ where: { id }, data: { status } });
  await logActivity(orgId, "booking", "status", `${b.customerName} → ${status}`, `/bookings/${id}`);
  refresh();
}

export async function deleteBooking(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const b = await prisma.booking.findFirst({ where: { id, trip: { orgId } }, select: { customerName: true } });
  if (!b) return;
  await prisma.booking.delete({ where: { id } });
  await logActivity(orgId, "booking", "deleted", `Deleted booking — ${b?.customerName ?? ""}`.trim());
  refresh();
}

// ---- Itinerary nights (hotels per date) ----
function toDate(v: FormDataEntryValue | null): Date | null {
  const s = String(v || "");
  return s ? new Date(s) : null;
}

export async function addNight(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const location = String(formData.get("location") || "").trim();
  if (!tripId || !location || !(await ownTrip(orgId, tripId))) return;
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
  const orgId = await guard();
  const id = String(formData.get("id"));
  await prisma.night.updateMany({
    where: { id, trip: { orgId } },
    data: {
      location: String(formData.get("location") || "").trim() || undefined,
      date: toDate(formData.get("date")),
      notes: String(formData.get("notes") || "") || null,
    },
  });
  refresh();
}

export async function deleteNight(formData: FormData) {
  const orgId = await guard();
  await prisma.night.deleteMany({ where: { id: String(formData.get("id")), trip: { orgId } } });
  refresh();
}

// ---- Hotel bookings (a night can have several) ----
export async function addHotelBooking(formData: FormData) {
  const orgId = await guard();
  const nightId = String(formData.get("nightId"));
  const hotelName = String(formData.get("hotelName") || "").trim();
  if (!nightId || !hotelName || !(await ownNight(orgId, nightId))) return;
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
  await logActivity(orgId, "hotel", "added", `Added “${hotelName}” · ${rooms} room${rooms === 1 ? "" : "s"} · ${formatINR(cost)}${night ? ` — ${night.location} (${night.trip.name})` : ""}`, night ? `/trips/${night.trip.id}` : null);
  refresh();
}

// Book one hotel across a range of nights at once. Each night in
// [checkIn, checkOut) gets its own HotelBooking; the total cost is split evenly.
// Dates outside the existing itinerary are added as new nights, labelled
// "Day X−n" (before the trip) or "Day Y+n" (after it).
export async function addHotelStay(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  const hotelName = String(formData.get("hotelName") || "").trim();
  const checkInStr = String(formData.get("checkIn") || "");
  if (!tripId || !hotelName || !checkInStr || !(await ownTrip(orgId, tripId))) return;

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
  await logActivity(orgId, "hotel", "added", `Booked “${hotelName}” for ${nights} night${nights === 1 ? "" : "s"} · ${formatINR(totalCost)} — ${trip.name}`, `/trips/${tripId}`);
  refresh();
}

export async function updateHotelBooking(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  if (!(await prisma.hotelBooking.findFirst({ where: { id, night: { trip: { orgId } } }, select: { id: true } }))) return;
  const updated = await prisma.hotelBooking.update({
    where: { id },
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
  await logActivity(orgId, "hotel", "updated", `Updated “${updated.hotelName}” · ${updated.rooms} rooms · ${formatINR(updated.cost)} · ${updated.status}`, `/trips/${updated.night.trip.id}`);
  refresh();
}

export async function deleteHotelBooking(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const h = await prisma.hotelBooking.findFirst({ where: { id, night: { trip: { orgId } } }, include: { night: { select: { location: true } } } });
  if (!h) return;
  await prisma.hotelBooking.delete({ where: { id } });
  await logActivity(orgId, "hotel", "deleted", `Deleted “${h?.hotelName ?? "hotel"}”${h?.night ? ` — ${h.night.location}` : ""}`);
  refresh();
}

// ---- Cars ----
export async function addCar(formData: FormData) {
  const orgId = await guard();
  const tripId = String(formData.get("tripId"));
  if (!tripId || !(await ownTrip(orgId, tripId))) return;
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
  await logActivity(orgId, "car", "added", `Added ${car.label}${car.carType ? ` · ${car.carType}` : ""} — ${car.trip.name}`, `/trips/${tripId}`);
  refresh();
}

export async function updateCar(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  if (!(await prisma.car.findFirst({ where: { id, trip: { orgId } }, select: { id: true } }))) return;
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
  await logActivity(orgId, "car", "updated", `Updated ${car.label} — ${car.trip.name}`, `/trips/${car.tripId}`);
  refresh();
}

export async function deleteCar(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const car = await prisma.car.findFirst({ where: { id, trip: { orgId } }, select: { label: true, tripId: true } });
  if (!car) return;
  await prisma.car.delete({ where: { id } });
  await logActivity(orgId, "car", "deleted", `Removed ${car?.label ?? "car"}`, car ? `/trips/${car.tripId}` : null);
  refresh();
}

// ---- GST/TCS remittance ----
export async function setTaxRemitted(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const remit = String(formData.get("remit")) === "1";
  await prisma.booking.updateMany({
    where: { id, trip: { orgId } },
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
  const orgId = await guard();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;
  const dateStr = String(formData.get("date") || "");
  await prisma.booking.updateMany({
    where: { id: { in: ids }, trip: { orgId } },
    data: {
      taxRemitted: true,
      taxRemittedOn: dateStr ? new Date(dateStr) : new Date(),
      taxRemittedNote: String(formData.get("note") || "") || null,
    },
  });
  refresh();
}

// ---- Travellers (people on a booking) ----
// Keep the booking's denormalised per-traveller extras total in sync.
async function recomputeTravellerExtra(bookingId: string) {
  const sum = await prisma.traveller.aggregate({ where: { bookingId }, _sum: { extraCharge: true } });
  await prisma.booking.update({ where: { id: bookingId }, data: { travellerExtra: sum._sum.extraCharge || 0 } });
}

export async function addTraveller(formData: FormData) {
  const orgId = await guard();
  const bookingId = String(formData.get("bookingId"));
  const name = String(formData.get("name") || "").trim();
  if (!bookingId || !name || !(await ownBooking(orgId, bookingId))) return;
  const ageStr = String(formData.get("age") || "").trim();
  await prisma.traveller.create({
    data: {
      bookingId, name,
      age: ageStr ? Number(ageStr) || null : null,
      extraCharge: parseAmount(String(formData.get("extraCharge"))),
      extraNote: String(formData.get("extraNote") || "") || null,
    },
  });
  await recomputeTravellerExtra(bookingId);
  refresh();
}

export async function updateTraveller(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  if (!(await prisma.traveller.findFirst({ where: { id, booking: { trip: { orgId } } }, select: { id: true } }))) return;
  const ageStr = String(formData.get("age") || "").trim();
  const tr = await prisma.traveller.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim() || undefined,
      age: ageStr ? Number(ageStr) || null : null,
      extraCharge: parseAmount(String(formData.get("extraCharge"))),
      extraNote: String(formData.get("extraNote") || "") || null,
    },
  });
  await recomputeTravellerExtra(tr.bookingId);
  refresh();
}

export async function deleteTraveller(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const found = await prisma.traveller.findFirst({ where: { id, booking: { trip: { orgId } } }, select: { id: true } });
  if (!found) return;
  const tr = await prisma.traveller.delete({ where: { id } });
  await recomputeTravellerExtra(tr.bookingId);
  refresh();
}

// ---- Payments ----
export async function addPayment(formData: FormData) {
  const orgId = await guard();
  const bookingId = String(formData.get("bookingId"));
  const amount = parseAmount(String(formData.get("amount")));
  if (!bookingId || amount <= 0 || !(await ownBooking(orgId, bookingId))) return;
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
  await logActivity(orgId, "payment", "added", `${payment.booking.customerName} paid ${formatINR(amount)} (${mode})`, `/bookings/${payment.booking.id}`);
  refresh();
}

export async function deletePayment(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const p = await prisma.payment.findFirst({ where: { id, booking: { trip: { orgId } } }, include: { booking: { select: { customerName: true } } } });
  if (!p) return;
  await prisma.payment.delete({ where: { id } });
  await logActivity(orgId, "payment", "deleted", p ? `Removed ${formatINR(p.amount)} payment — ${p.booking.customerName}` : "Removed a payment");
  refresh();
}

// ---- Customer-submitted payments (public link) approval ----
export async function approvePendingPayment(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const p = await prisma.pendingPayment.findFirst({ where: { id, OR: [{ booking: { trip: { orgId } } }, { trip: { orgId } }] } });
  if (!p) return;

  // Matched → its booking. Unmatched (universal link) → the operator must pick one.
  let bookingId = p.bookingId;
  if (!bookingId) {
    const chosen = String(formData.get("bookingId") || "");
    if (!chosen) return; // no customer chosen yet — nothing to record
    const b = await prisma.booking.findFirst({ where: { id: chosen, trip: { orgId } }, select: { id: true } });
    if (!b) return;
    bookingId = b.id;
  }
  const cust = await prisma.booking.findUnique({ where: { id: bookingId }, select: { customerName: true } });
  await prisma.payment.create({
    data: {
      bookingId,
      amount: p.amount,
      mode: p.mode,
      date: p.date,
      note: [p.reference ? `ref ${p.reference}` : "", p.note || "", "via link"].filter(Boolean).join(" · ") || null,
    },
  });
  await prisma.pendingPayment.delete({ where: { id } });
  await logActivity(orgId, "payment", "added", `Approved ${formatINR(p.amount)} (${p.mode}) — ${cust?.customerName ?? p.payerName ?? ""}`, `/bookings/${bookingId}`);
  refresh();
}

export async function updateVisaApplicant(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  await prisma.visaApplicant.updateMany({
    where: { id, trip: { orgId } },
    data: {
      status: String(formData.get("status") || "collecting"),
      appointmentAt: toDate(formData.get("appointmentAt")),
    },
  });
  refresh();
}

export async function deleteVisaApplicant(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const v = await prisma.visaApplicant.findFirst({ where: { id, trip: { orgId } }, select: { fullName: true } });
  if (!v) return;
  await prisma.visaApplicant.delete({ where: { id } });
  if (v) await logActivity(orgId, "trip", "deleted", `Deleted visa form — ${v.fullName}`);
  refresh();
}

export async function rejectPendingPayment(formData: FormData) {
  const orgId = await guard();
  const id = String(formData.get("id"));
  const p = await prisma.pendingPayment.findFirst({ where: { id, OR: [{ booking: { trip: { orgId } } }, { trip: { orgId } }] }, include: { booking: { select: { customerName: true } } } });
  if (!p) return;
  await prisma.pendingPayment.delete({ where: { id } });
  await logActivity(orgId, "payment", "deleted", `Rejected self-reported ${formatINR(p.amount)} — ${p.booking?.customerName ?? p.payerName ?? "unmatched"}`);
  refresh();
}
