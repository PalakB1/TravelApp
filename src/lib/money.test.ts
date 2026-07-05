import { describe, it, expect } from "vitest";
import { parseAmount, formatINR, formatINRShort } from "./money";

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
