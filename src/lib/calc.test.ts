import { describe, it, expect } from "vitest";
import { bookingBase, bookingTaxable, bookingGst, bookingTcs, bookingTotal, bookingRevenue, bookingTax, bookingBalance } from "./calc";

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
