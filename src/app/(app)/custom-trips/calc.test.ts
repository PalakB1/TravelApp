import { describe, it, expect } from "vitest";
import { ctTaxable, ctGst, ctTcs, ctTotal, ctRevenue, ctCost, ctProfit, ctOutstanding, ctTax } from "./calc";
import { bookingTaxable, bookingGst, bookingTcs, bookingTax } from "../../../lib/calc";

// The GST/TCS chain is defined once in lib/calc and shared with package bookings.
// These lock the two together: reintroduce a local copy here, or change one side's
// rule, and they stop agreeing.
describe("tax rule is shared with package bookings, not copied", () => {
  const rates5x2 = { gstRate: 5, tcsRate: 2 };
  const rates18x5 = { gstRate: 18, tcsRate: 5 }; // awkward rounding on both steps
  const custom = (sell: number, rates: { gstRate: number; tcsRate: number }) => ({
    items: [{ qty: 1, cost: 0, sell, taxable: true }],
    ...rates,
  });
  const booking = (sell: number, rates: { gstRate: number; tcsRate: number }) => ({
    pax: 1,
    discount: 0,
    status: "confirmed",
    landAmount: sell,
    ...rates,
  });

  it("gives a custom trip the same tax as a booking of the same value", () => {
    expect(ctTaxable(custom(90000, rates5x2))).toBe(bookingTaxable(booking(90000, rates5x2)));
    expect(ctGst(custom(90000, rates5x2))).toBe(bookingGst(booking(90000, rates5x2)));
    expect(ctTcs(custom(90000, rates5x2))).toBe(bookingTcs(booking(90000, rates5x2)));
    expect(ctTax(custom(90000, rates5x2))).toBe(bookingTax(booking(90000, rates5x2)));
  });

  it("still agrees on rates and amounts that round awkwardly", () => {
    expect(ctGst(custom(33333, rates18x5))).toBe(bookingGst(booking(33333, rates18x5)));
    expect(ctTcs(custom(33333, rates18x5))).toBe(bookingTcs(booking(33333, rates18x5)));
    expect(ctTax(custom(33333, rates18x5))).toBe(bookingTax(booking(33333, rates18x5)));
  });
});

describe("custom-trip money math (mirrors trip GST/TCS)", () => {
  it("single taxable item: revenue, cost, profit, GST, TCS", () => {
    const t = { items: [{ qty: 1, cost: 40000, sell: 50000, taxable: true }], gstRate: 5, tcsRate: 2 };
    expect(ctTaxable(t)).toBe(50000);
    expect(ctGst(t)).toBe(2500);
    expect(ctTcs(t)).toBe(1050); // (50000 + 2500) * 2%
    expect(ctTotal(t)).toBe(53550);
    expect(ctRevenue(t)).toBe(50000);
    expect(ctCost(t)).toBe(40000);
    expect(ctProfit(t)).toBe(10000);
    expect(ctTax(t)).toBe(3550);
  });

  it("mixes taxable + non-taxable lines", () => {
    const t = {
      items: [
        { qty: 1, cost: 40000, sell: 50000, taxable: true },
        { qty: 1, cost: 1500, sell: 2000, taxable: false },
      ],
      gstRate: 5, tcsRate: 2,
    };
    expect(ctTaxable(t)).toBe(50000);
    expect(ctRevenue(t)).toBe(52000);
    expect(ctTotal(t)).toBe(55550); // 50000 + 2500 + 1050 + 2000
    expect(ctProfit(t)).toBe(10500);
  });

  it("respects quantity", () => {
    const t = { items: [{ qty: 2, cost: 10000, sell: 15000, taxable: true }], gstRate: 5, tcsRate: 2 };
    expect(ctTaxable(t)).toBe(30000);
    expect(ctCost(t)).toBe(20000);
    expect(ctProfit(t)).toBe(10000);
  });

  it("applies discount and defaults to 5% GST / 2% TCS when rates omitted", () => {
    const t = { items: [{ qty: 1, cost: 0, sell: 100000, taxable: true }], discount: 10000 };
    expect(ctTaxable(t)).toBe(90000);
    expect(ctGst(t)).toBe(4500);
    expect(ctTcs(t)).toBe(1890);
  });

  it("outstanding = total − payments", () => {
    const t = { items: [{ qty: 1, cost: 40000, sell: 50000, taxable: true }], gstRate: 5, tcsRate: 2, payments: [{ amount: 20000 }] };
    expect(ctOutstanding(t)).toBe(33550); // 53550 − 20000
  });
});
