import { describe, it, expect } from "vitest";
import { financialYear, amountInWords } from "./invoice";

describe("financialYear (April–March)", () => {
  it("maps months to the right FY", () => {
    expect(financialYear(new Date("2026-07-06"))).toBe("2026-27");
    expect(financialYear(new Date("2026-03-31"))).toBe("2025-26");
    expect(financialYear(new Date("2026-04-01"))).toBe("2026-27");
    expect(financialYear(new Date("2027-01-15"))).toBe("2026-27");
  });
});

describe("amountInWords (Indian)", () => {
  it("converts whole rupees", () => {
    expect(amountInWords(0)).toBe("Zero Rupees Only");
    expect(amountInWords(500)).toBe("Five Hundred Rupees Only");
    expect(amountInWords(107100)).toBe("One Lakh Seven Thousand One Hundred Rupees Only");
    expect(amountInWords(296667)).toBe("Two Lakh Ninety Six Thousand Six Hundred Sixty Seven Rupees Only");
    expect(amountInWords(10000000)).toBe("One Crore Rupees Only");
  });
});
