import { describe, it, expect } from "vitest";
import { splitCash } from "./cashsplit";

const GST = 5, TCS = 2;

describe("splitCash", () => {
  it("keeps the two halves adding up to exactly what was agreed", () => {
    for (const agreed of [420000, 100000, 99999, 1, 777777]) {
      for (const pct of [0, 15, 30, 50, 70, 100]) {
        const s = splitCash(agreed, pct, "cash", GST, TCS);
        expect(s.total).toBe(agreed);
        expect(s.taxable + s.tax + s.tax2).toBe(s.grossBilled);
      }
    }
  });

  it("takes tax out of the invoice share rather than adding it on top", () => {
    // ₹4,20,000 agreed, 30% cash → ₹1,26,000 cash, ₹2,94,000 invoiced INCLUDING
    // 7% of tax, so the taxable value is 294000 / 1.07.
    const s = splitCash(420000, 30, "cash", GST, TCS);
    expect(s.cash).toBe(126000);
    expect(s.grossBilled).toBe(294000);
    expect(s.taxable).toBe(294000 - s.tax - s.tax2);
    expect(s.tax).toBe(Math.round(Math.round(294000 / 1.07) * 0.05));
    // and emphatically not the naive reading
    expect(s.taxable).not.toBe(294000);
  });

  it("reads the percentage the way the direction says", () => {
    const asCash = splitCash(100000, 30, "cash", GST, TCS);
    const asBilled = splitCash(100000, 30, "billed", GST, TCS);
    expect(asCash.cash).toBe(30000);
    expect(asBilled.cash).toBe(70000);
    expect(asCash.grossBilled).toBe(70000);
    expect(asBilled.grossBilled).toBe(30000);
  });

  it("handles the ends: all cash, and nothing cash", () => {
    const allCash = splitCash(250000, 100, "cash", GST, TCS);
    expect(allCash.cash).toBe(250000);
    expect(allCash.grossBilled).toBe(0);
    expect(allCash.tax).toBe(0);

    const noCash = splitCash(250000, 0, "cash", GST, TCS);
    expect(noCash.cash).toBe(0);
    expect(noCash.grossBilled).toBe(250000);
    expect(noCash.taxable + noCash.tax + noCash.tax2).toBe(250000);
  });

  it("copes with an org that charges no tax at all", () => {
    const s = splitCash(100000, 40, "cash", 0, 0);
    expect(s.taxable).toBe(60000);
    expect(s.tax).toBe(0);
    expect(s.total).toBe(100000);
  });

  it("refuses to invent money from nonsense input", () => {
    expect(splitCash(0, 30, "cash", GST, TCS).total).toBe(0);
    expect(splitCash(-5000, 30, "cash", GST, TCS).total).toBe(0);
    expect(splitCash(100000, 999, "cash", GST, TCS).cash).toBe(100000);
    expect(splitCash(100000, -20, "cash", GST, TCS).cash).toBe(0);
  });
});
