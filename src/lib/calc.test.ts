import { describe, it, expect } from "vitest";
import { bookingBase, bookingTaxable, bookingGst, bookingTcs, bookingTotal, bookingRevenue, bookingTax, bookingBalance, reconcileTrip } from "./calc";

const base = { pax: 1, discount: 0, status: "confirmed" as const };

describe("booking GST/TCS math", () => {
  it("land-only booking: GST 5%, TCS 2% on (taxable + GST)", () => {
    const b = { ...base, landAmount: 100000, gstRate: 5, tcsRate: 2 };
    expect(bookingBase(b)).toBe(100000);
    expect(bookingTaxable(b)).toBe(100000);
    expect(bookingGst(b)).toBe(5000);
    expect(bookingTcs(b)).toBe(2100); // (100000 + 5000) * 2%
    expect(bookingTotal(b)).toBe(107100);
    expect(bookingRevenue(b)).toBe(100000);
    expect(bookingTax(b)).toBe(7100);
  });

  it("applies discount before tax", () => {
    const b = { ...base, landAmount: 100000, discount: 10000, gstRate: 5, tcsRate: 2 };
    expect(bookingTaxable(b)).toBe(90000);
    expect(bookingGst(b)).toBe(4500);
    expect(bookingTcs(b)).toBe(1890); // (90000 + 4500) * 2%
    expect(bookingTotal(b)).toBe(96390);
  });

  it("non-taxable amount is billed but excluded from GST/TCS and counts as revenue", () => {
    const b = { ...base, landAmount: 100000, nonTaxable: 2000, gstRate: 5, tcsRate: 2 };
    expect(bookingTax(b)).toBe(7100); // unchanged by the ₹2000
    expect(bookingTotal(b)).toBe(109100);
    expect(bookingRevenue(b)).toBe(102000);
  });

  it("falls back to per-person variant price when no itemised amounts", () => {
    const b = { ...base, pax: 2, variant: { sellPrice: 50000 }, gstRate: 5, tcsRate: 2 };
    expect(bookingBase(b)).toBe(100000);
    expect(bookingTaxable(b)).toBe(100000);
  });

  it("adds taxable inclusions (× pax) and per-traveller extras into the taxable base", () => {
    const b = { ...base, pax: 2, landAmount: 100000, inclTaxPP: 5000, travellerExtra: 3000, gstRate: 5, tcsRate: 2 };
    // 100000 + 5000*2 + 3000 = 113000
    expect(bookingTaxable(b)).toBe(113000);
  });

  it("balance = total − payments", () => {
    const b = { ...base, landAmount: 100000, gstRate: 5, tcsRate: 2, payments: [{ amount: 50000 }, { amount: 7100 }] };
    expect(bookingBalance(b)).toBe(50000); // 107100 − 57100
  });
});

describe("costing reconciliation (estimate → actual)", () => {
  const hotels = [{ id: "h1", estimate: 60000 }, { id: "h2", estimate: 40000 }];
  const cars = [{ id: "c1", estimate: 30000 }];
  // estimateCost = 60000 + 40000 + 30000 + otherEstimate(10000) = 140000
  const args = { revenue: 200000, estimateCost: 140000, hotels, cars, otherEstimate: 10000 };

  it("with no expenses logged, reconciled cost equals the estimate", () => {
    const r = reconcileTrip({ ...args, expenses: [] });
    expect(r.hasActuals).toBe(false);
    expect(r.reconciledCost).toBe(140000);
    expect(r.reconciledProfit).toBe(60000);
    expect(r.variance).toBe(0);
  });

  it("swaps the actual invoice in for a specific hotel and keeps estimates elsewhere", () => {
    // h1 actually cost 72000 (over the 60000 hold); everything else unlogged
    const r = reconcileTrip({ ...args, expenses: [{ amount: 72000, hotelId: "h1" }] });
    expect(r.hotelReconciled).toBe(72000 + 40000); // actual h1 + estimate h2
    expect(r.reconciledCost).toBe(152000); // 112000 + 30000 + 10000
    expect(r.variance).toBe(12000); // costing 12k more than the hold
    expect(r.reconciledProfit).toBe(48000);
  });

  it("adds trip-level spend (no hotel/car) on top of estimates", () => {
    const r = reconcileTrip({ ...args, expenses: [{ amount: 5000, carId: "c1" }, { amount: 8000 }] });
    expect(r.carReconciled).toBe(5000); // actual replaces the 30000 car hold
    expect(r.otherActual).toBe(8000); // fuel/guide/etc — added
    expect(r.reconciledCost).toBe(60000 + 40000 + 5000 + 10000 + 8000); // 123000
    expect(r.totalActual).toBe(13000);
  });

  it("sums multiple invoices for the same hotel", () => {
    const r = reconcileTrip({ ...args, expenses: [{ amount: 30000, hotelId: "h1" }, { amount: 25000, hotelId: "h1" }] });
    expect(r.hotelActual).toBe(55000);
    expect(r.hotelReconciled).toBe(55000 + 40000);
  });
});
