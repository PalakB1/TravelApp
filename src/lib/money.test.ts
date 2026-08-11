import { describe, it, expect } from "vitest";
import { parseAmount, parseRate, formatINR, formatINRShort, formatMoney, formatMoneyShort, INR } from "./money";

describe("parseAmount", () => {
  it("parses plain numbers and strings", () => {
    expect(parseAmount("40000")).toBe(40000);
    expect(parseAmount(50000)).toBe(50000);
    expect(parseAmount("₹1,00,000")).toBe(100000);
  });
  it("understands k / l / cr shorthand", () => {
    expect(parseAmount("45k")).toBe(45000);
    expect(parseAmount("1.2l")).toBe(120000);
    expect(parseAmount("2cr")).toBe(20000000);
    expect(parseAmount("3 lakh")).toBe(300000);
  });
  it("is safe on junk / empty", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });
});

describe("parseRate", () => {
  it("treats a CLEARED box as zero, not as the default", () => {
    // The bug: a customer exempt from GST/TCS had the field emptied, and the
    // rate silently sprang back to 5% / 2%.
    expect(parseRate("", 5)).toBe(0);
    expect(parseRate("   ", 2)).toBe(0);
  });
  it("still falls back when the form has no rate field at all", () => {
    // Quick entry and the Reports booking form don't collect GST/TCS — those
    // must keep the standard rates, not silently drop to zero.
    expect(parseRate(null, 5)).toBe(5);
    expect(parseRate(undefined, 2)).toBe(2);
  });
  it("keeps an explicit zero", () => {
    expect(parseRate("0", 5)).toBe(0);
    expect(parseRate(0, 5)).toBe(0);
  });
  it("reads normal rates", () => {
    expect(parseRate("18", 5)).toBe(18);
    expect(parseRate("5", 5)).toBe(5);
  });
  it("rounds to a whole percent (the DB column is an Int)", () => {
    expect(parseRate("5.4", 5)).toBe(5);
    expect(parseRate("5.6", 5)).toBe(6);
  });
  it("never goes negative, and junk means zero", () => {
    expect(parseRate("-3", 5)).toBe(0);
    expect(parseRate("abc", 5)).toBe(0);
  });
});

describe("formatINR / formatINRShort", () => {
  it("formats full rupees with Indian grouping", () => {
    expect(formatINR(100000)).toBe("₹1,00,000");
    expect(formatINR(0)).toBe("₹0");
  });
  it("compacts big numbers (2-decimal L/Cr, as shown on the dashboard)", () => {
    expect(formatINRShort(840000)).toBe("₹8.40L");
    expect(formatINRShort(12000000)).toBe("₹1.20Cr");
    expect(formatINRShort(5000)).toBe("₹5K");
    expect(formatINRShort(500)).toBe("₹500");
  });
});

describe("per-country money formatting", () => {
  const GB = { currency: "GBP", locale: "en-GB" };
  const US = { currency: "USD", locale: "en-US" };

  it("uses the right symbol and grouping per locale", () => {
    // India groups the same number differently from everywhere else.
    expect(formatMoney(100000, INR)).toBe("₹1,00,000");
    expect(formatMoney(100000, GB)).toBe("£100,000");
    expect(formatMoney(100000, US)).toBe("$100,000");
  });

  it("never shows minor units", () => {
    expect(formatMoney(1234, GB)).toBe("£1,234");
    expect(formatMoney(0, US)).toBe("$0");
  });

  it("uses lakh and crore only where they'd be understood", () => {
    // Two decimals is the established dashboard convention (see above); only
    // trailing zeros are dropped.
    expect(formatMoneyShort(2500000, INR)).toBe("₹25L");
    expect(formatMoneyShort(25000000, INR)).toBe("₹2.50Cr");
    expect(formatMoneyShort(2500000, GB)).toBe("£2.50M");
    expect(formatMoneyShort(25000, US)).toBe("$25K");
  });

  it("survives a currency code nobody recognises", () => {
    expect(formatMoney(500, { currency: "ZZZ", locale: "en-GB" })).toContain("500");
  });

  it("strips any currency symbol when parsing, not just the rupee", () => {
    expect(parseAmount("£12,000")).toBe(12000);
    expect(parseAmount("$45k")).toBe(45000);
    expect(parseAmount("₹1.2l")).toBe(120000);
  });
});
