// Pure money + operations math. Everything is whole rupees (₹).
// For self-drive trips, "your cost" is the real spend: hotels (per night) +
// car rentals + hired drivers + any extras. Profit = revenue − that.

type VariantLite = { sellPrice: number } | null;
type PaymentLite = { amount: number };
type BookingLite = {
  pax: number;
  discount: number;
  status: string;
  packageType?: string;
  landAmount?: number;
  visaAmount?: number;
  flightAmount?: number;
  nonTaxable?: number;
  gstRate?: number;
  tcsRate?: number;
  variant?: VariantLite;
  payments?: PaymentLite[];
};
type HotelBookingLite = { cost: number; rooms: number; status: string; holdUntil?: Date | null };
type NightLite = { hotels: HotelBookingLite[]; extra?: boolean };
type CarLite = { rentalCost: number; driverMode: string; driverCost: number; status: string; holdUntil?: Date | null; driverNeedsStay?: boolean; seats?: number };

// Seats available to travellers in a car (a hired driver takes one seat).
export function carPassengerSeats(c: CarLite): number {
  const s = c.seats ?? 0;
  return Math.max(0, s - (c.driverMode === "hired" ? 1 : 0));
}
type VendorLite = { cost: number; actualCost?: number | null };
export const vendorCost = (v: VendorLite) => (v.actualCost != null ? v.actualCost : v.cost);

export const isActive = (status: string) => status !== "cancelled";

// Package value before discount: itemised (land+visa+flight), else per-person variant.
export function bookingBase(b: BookingLite): number {
  const items = (b.landAmount || 0) + (b.visaAmount || 0) + (b.flightAmount || 0);
  if (items > 0) return items;
  return (b.variant?.sellPrice ?? 0) * b.pax;
}
// Taxable subtotal after discount — this is the company's sale value.
export function bookingTaxable(b: BookingLite): number {
  return Math.max(0, bookingBase(b) - (b.discount || 0));
}
export function bookingGst(b: BookingLite): number {
  return Math.round((bookingTaxable(b) * (b.gstRate ?? 5)) / 100);
}
// TCS is charged on the taxable value PLUS GST (matches Indian tour-package billing).
export function bookingTcs(b: BookingLite): number {
  return Math.round(((bookingTaxable(b) + bookingGst(b)) * (b.tcsRate ?? 2)) / 100);
}
// What the client actually pays: taxable + GST + TCS + any non-taxable amount.
export function bookingTotal(b: BookingLite): number {
  return bookingTaxable(b) + bookingGst(b) + bookingTcs(b) + (b.nonTaxable || 0);
}
// Revenue counted toward profit = your sale value (taxable) plus any non-taxable
// amount you bill (e.g. a visa fee). Only GST/TCS are excluded — those pass through to govt.
export function bookingRevenue(b: BookingLite): number {
  return bookingTaxable(b) + (b.nonTaxable || 0);
}
// Total tax collected on a booking that must be remitted to the government.
export function bookingTax(b: BookingLite): number {
  return bookingGst(b) + bookingTcs(b);
}
export function bookingPaid(b: BookingLite): number {
  return (b.payments ?? []).reduce((s, p) => s + p.amount, 0);
}
export function bookingBalance(b: BookingLite): number {
  return bookingTotal(b) - bookingPaid(b);
}

// Price per room for a single hotel booking.
export function pricePerRoom(b: { cost: number; rooms: number }): number {
  return b.rooms > 0 ? Math.round(b.cost / b.rooms) : 0;
}

// A night is a gap unless at least one hotel on it is held or confirmed.
export function isNightGap(n: NightLite): boolean {
  return !n.hotels.some((h) => h.status === "hold" || h.status === "final");
}
export function nightRooms(n: NightLite): number {
  return n.hotels.reduce((s, h) => s + h.rooms, 0);
}
// Rooms actually secured for a night (held or confirmed).
export function nightBookedRooms(n: NightLite): number {
  return n.hotels.filter((h) => h.status === "hold" || h.status === "final").reduce((s, h) => s + h.rooms, 0);
}
// Minimum rooms the group needs each night, at maxPerRoom guests per room.
export function roomsNeeded(pax: number, maxPerRoom: number): number {
  const per = maxPerRoom > 0 ? maxPerRoom : 2;
  return pax > 0 ? Math.ceil(pax / per) : 0;
}
export function nightCost(n: NightLite): number {
  return n.hotels.reduce((s, h) => s + h.cost, 0);
}

export function carCost(c: CarLite): number {
  return c.rentalCost + (c.driverMode === "hired" ? c.driverCost : 0);
}

// Holds expiring within `days` (or already past) — the "hold radar".
export function holdExpiringSoon(status: string, holdUntil: Date | null | undefined, days = 3): boolean {
  if (status !== "hold" || !holdUntil) return false;
  const limit = Date.now() + days * 864e5;
  return new Date(holdUntil).getTime() <= limit;
}

export function tripFinancials(args: {
  bookings: BookingLite[];
  nights?: NightLite[];
  cars?: CarLite[];
  vendorBookings?: VendorLite[];
  maxPerRoom?: number;
}) {
  const active = args.bookings.filter((b) => isActive(b.status));
  const pax = active.reduce((s, b) => s + b.pax, 0);

  // Revenue (for profit) is the pre-tax sale value; the client's invoice and
  // balance include GST + TCS, which pass through to the government.
  const revenue = active.reduce((s, b) => s + bookingRevenue(b), 0);
  const invoiced = active.reduce((s, b) => s + bookingTotal(b), 0);
  const taxCollected = active.reduce((s, b) => s + bookingGst(b) + bookingTcs(b), 0);
  const paid = active.reduce((s, b) => s + bookingPaid(b), 0);
  const outstanding = invoiced - paid;
  const discounts = active.reduce((s, b) => s + (b.discount || 0), 0);

  const nights = args.nights ?? [];
  const cars = args.cars ?? [];
  const vendor = args.vendorBookings ?? [];

  const allHotels = nights.flatMap((n) => n.hotels);
  const hotelCost = allHotels.reduce((s, h) => s + h.cost, 0);
  const carRental = cars.reduce((s, c) => s + c.rentalCost, 0);
  const driverCost = cars.reduce((s, c) => s + (c.driverMode === "hired" ? c.driverCost : 0), 0);
  const extrasCost = vendor.reduce((s, v) => s + vendorCost(v), 0);
  const extrasPlanned = vendor.reduce((s, v) => s + v.cost, 0);
  const extrasActual = vendor.reduce((s, v) => s + (v.actualCost ?? 0), 0);
  const cost = hotelCost + carRental + driverCost + extrasCost;

  const profit = revenue - cost;
  const margin = revenue > 0 ? profit / revenue : 0;

  // Extra add-on nights are booked per customer need — they don't count as gaps
  // or toward room-coverage requirements.
  const coreNights = nights.filter((n) => !n.extra);
  const unbookedNights = coreNights.filter(isNightGap).length;
  const expiringHolds =
    allHotels.filter((h) => holdExpiringSoon(h.status, h.holdUntil)).length +
    cars.filter((c) => holdExpiringSoon(c.status, c.holdUntil)).length;

  // Rooms coverage: nights where the rooms held/confirmed can't fit the group.
  // Each hired driver who needs to stay adds one room every night.
  // Rooms = everyone (travellers + drivers who need a bed) pooled at maxPerRoom.
  const driverRooms = cars.filter((c) => c.driverMode === "hired" && c.driverNeedsStay).length; // drivers needing a bed
  const guestRooms = roomsNeeded(pax, args.maxPerRoom ?? 2); // travellers only (reference)
  const needRooms = roomsNeeded(pax + driverRooms, args.maxPerRoom ?? 2);

  const hiredDrivers = cars.filter((c) => c.driverMode === "hired").length;
  const totalPeople = pax + hiredDrivers;

  // Seat coverage: do the cars seat every traveller?
  const carSeats = cars.reduce((s, c) => s + carPassengerSeats(c), 0);
  const seatsSet = cars.some((c) => (c.seats ?? 0) > 0);
  const seatsShort = seatsSet ? Math.max(0, pax - carSeats) : 0;
  const shortRoomNights = needRooms > 0
    ? coreNights.filter((n) => !isNightGap(n) && nightBookedRooms(n) < needRooms).length
    : 0;

  return {
    pax,
    revenue,
    invoiced,
    taxCollected,
    paid,
    outstanding,
    discounts,
    hotelCost,
    carRental,
    driverCost,
    extrasCost,
    extrasPlanned,
    extrasActual,
    cost,
    profit,
    margin,
    bookingCount: active.length,
    nightCount: nights.length,
    unbookedNights,
    expiringHolds,
    roomsNeeded: needRooms,
    guestRooms,
    driverRooms,
    shortRoomNights,
    carSeats,
    seatsShort,
    hiredDrivers,
    totalPeople,
  };
}

export type TripFinancials = ReturnType<typeof tripFinancials>;
