import { describe, it, expect } from "vitest";
import { quoteTotals, quoteExpired, quoteState, lineTotal } from "./quote";

const L = (label: string, qty: number, unitPrice: number, taxable = true) => ({ label, qty, unitPrice, taxable });

describe("quoteTotals", () => {
  it("adds tax on top of the taxable lines only", () => {
    const t = quoteTotals([L("Land package", 6, 50000), L("Visa fees", 6, 9000, false)], 5);
    expect(t.taxableBase).toBe(300000);
    expect(t.nonTaxable).toBe(54000);
    expect(t.tax).toBe(15000);
    expect(t.total).toBe(369000);
  });

  it("divides by the group size when there is one", () => {
    const t = quoteTotals([L("Land package", 6, 50000)], 5, 6);
    expect(t.total).toBe(315000);
    expect(t.perPerson).toBe(52500);
  });

  it("has no per-person figure when nobody said how many people", () => {
    expect(quoteTotals([L("x", 1, 1000)], 5).perPerson).toBe(null);
    expect(quoteTotals([L("x", 1, 1000)], 5, 0).perPerson).toBe(null);
  });

  it("takes a discount as a negative line, which is how it should read", () => {
    const t = quoteTotals([L("Land package", 2, 100000), L("Early-bird discount", 1, -15000)], 5);
    expect(t.taxableBase).toBe(185000);
    expect(t.tax).toBe(9250);
    expect(t.total).toBe(194250);
  });

  it("comes to nothing when there are no lines", () => {
    const t = quoteTotals([], 5, 4);
    expect(t.total).toBe(0);
    expect(t.perPerson).toBe(0);
  });

  it("survives an agency that charges no sales tax", () => {
    expect(quoteTotals([L("Package", 1, 100000)], 0).total).toBe(100000);
  });

  it("ignores a line with no quantity rather than guessing at one", () => {
    expect(lineTotal({ qty: 0, unitPrice: 5000 })).toBe(0);
  });
});

describe("quoteExpired", () => {
  const validUntil = new Date("2026-11-10T00:00:00Z");

  it("counts the whole of the stated day as still valid", () => {
    expect(quoteExpired(validUntil, new Date("2026-11-10T23:00:00Z"))).toBe(false);
    expect(quoteExpired(validUntil, new Date("2026-11-11T00:30:00Z"))).toBe(true);
  });

  it("never expires when no date was set", () => {
    expect(quoteExpired(null, new Date("2030-01-01T00:00:00Z"))).toBe(false);
  });
});

describe("quoteState", () => {
  const past = new Date("2026-01-01T00:00:00Z");
  const now = new Date("2026-11-20T00:00:00Z");

  it("shows a sent quote as expired once its date has gone", () => {
    expect(quoteState({ status: "sent", validUntil: past }, now).label).toBe("expired");
    expect(quoteState({ status: "sent", validUntil: null }, now).label).toBe("sent");
  });

  it("does not call an accepted quote expired, whatever the date says", () => {
    expect(quoteState({ status: "accepted", validUntil: past }, now).label).toBe("accepted");
  });

  it("leaves a draft a draft", () => {
    expect(quoteState({ status: "draft", validUntil: past }, now).label).toBe("draft");
  });
});
