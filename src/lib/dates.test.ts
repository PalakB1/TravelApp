import { describe, it, expect } from "vitest";
import { fmtDay, fmtDayLong, toDay, dayInput, todayDay } from "./dates";

describe("calendar days survive the server's timezone", () => {
  it("shows the day that was typed, not the server's idea of it", () => {
    // The live bug: entered in India as 31 July, stored as midnight IST.
    const storedIstMidnight = new Date("2026-07-30T18:30:00.000Z");
    // Formatted in UTC this reads 30 July — which is why receipts were a day out.
    expect(fmtDay(storedIstMidnight)).toBe("30 Jul 2026");
    // Stored properly as a calendar day, it reads back correctly.
    expect(fmtDay(toDay("2026-07-31"))).toBe("31 Jul 2026");
    expect(fmtDayLong(toDay("2026-07-31"))).toBe("31 July 2026");
  });

  it("round-trips a date box without drifting", () => {
    for (const s of ["2026-01-01", "2026-07-31", "2026-12-31", "2027-02-28"]) {
      expect(dayInput(toDay(s))).toBe(s);
    }
  });

  it("is stable regardless of the machine's timezone", () => {
    // toDay pins to UTC, so the same string always yields the same instant.
    expect(toDay("2026-07-31")!.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("takes today from the local clock, not from UTC", () => {
    // 21 Sep 02:00 IST is still 20 Sep in UTC — the local day is what counts.
    const lateNight = new Date(2026, 8, 21, 2, 0, 0);
    expect(dayInput(todayDay(lateNight))).toBe("2026-09-21");
  });

  it("handles nothing gracefully", () => {
    expect(fmtDay(null)).toBe("—");
    expect(toDay("")).toBe(null);
    expect(dayInput(null)).toBe("");
  });
});
