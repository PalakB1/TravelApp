import { describe, it, expect } from "vitest";
import { scheduleStatus } from "./schedule";

// Regression: a plan left over from a bigger price must not invent a debt.
// Reported from a live booking — invoice 99,000, plan still summing to 208,950,
// the customer had paid all 99,000 and the screen said "behind by 1,09,950".
describe("plan out of step with the invoice", () => {
  const plan = [
    { id: "a", label: "Booking amount", amount: 20895, dueDate: new Date("2026-08-09"), order: 0 },
    { id: "b", label: "Second", amount: 62685, dueDate: new Date("2026-08-09"), order: 1 },
    { id: "c", label: "Third", amount: 62685, dueDate: new Date("2026-08-09"), order: 2 },
    { id: "d", label: "Fourth", amount: 62685, dueDate: new Date("2026-08-09"), order: 3 },
  ];
  const now = new Date("2026-08-10");

  it("shows nothing due once the invoice is paid in full", () => {
    const lines = scheduleStatus(plan, 99000, { invoiceTotal: 99000, now });
    expect(lines.every((l) => l.covered)).toBe(true);
    expect(lines.some((l) => l.overdue)).toBe(false);
    expect(lines.reduce((s, l) => s + l.remaining, 0)).toBe(0);
  });

  it("never asks for more than the invoice in total", () => {
    const lines = scheduleStatus(plan, 0, { invoiceTotal: 99000, now });
    expect(lines.reduce((s, l) => s + l.effectiveAmount, 0)).toBe(99000);
    // The last step is entirely past the invoice, so it asks for nothing.
    expect(lines[3].beyondInvoice).toBe(true);
    expect(lines[3].effectiveAmount).toBe(0);
  });

  it("still tracks a genuine part payment", () => {
    const lines = scheduleStatus(plan, 20895, { invoiceTotal: 99000, now });
    expect(lines[0].covered).toBe(true);
    expect(lines[1].remaining).toBe(62685);
    expect(lines[1].overdue).toBe(true);
    // Third is trimmed to what's left of the invoice: 99000 - 20895 - 62685.
    expect(lines[2].effectiveAmount).toBe(15420);
  });

  it("leaves the plan alone when no invoice total is given", () => {
    const lines = scheduleStatus(plan, 0, { now });
    expect(lines.reduce((s, l) => s + l.effectiveAmount, 0)).toBe(208950);
  });
});
