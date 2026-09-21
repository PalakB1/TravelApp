// Dates in this app are CALENDAR DAYS, not instants.
//
// "Payment received on 31 July" means the 31st of July wherever you happen to
// read it. But a Date is a point in time, and formatting one without naming a
// timezone renders it in whatever zone the process runs in — UTC on Vercel.
// So a payment entered in India as 31 July, stored as 30 July 18:30 UTC (which
// is midnight IST), printed on a receipt as "30 July". A day early, on a
// document sent to a customer.
//
// The rule, applied both ways:
//   • a day typed into a date box is stored at UTC midnight of that day
//   • a day is always displayed in UTC
// so the day that comes out is exactly the day that went in, for everyone.

const DAY = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } as const;
const DAY_LONG = { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" } as const;
const DAY_SHORT = { day: "numeric", month: "short", timeZone: "UTC" } as const;

/** "21 Sep 2026" */
export function fmtDay(d: Date | string | null | undefined, locale = "en-IN"): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, DAY);
}

/** "21 September 2026" — for documents. */
export function fmtDayLong(d: Date | string | null | undefined, locale = "en-IN"): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, DAY_LONG);
}

/** "21 Sep" — where the year is obvious from context. */
export function fmtDayShort(d: Date | string | null | undefined, locale = "en-IN"): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(locale, DAY_SHORT);
}

/** A day plus a wall-clock time, e.g. "21 Sep, 14:30" — for flights. */
export function fmtDayTime(d: Date | string | null | undefined, locale = "en-GB"): string {
  if (!d) return "—";
  return new Date(d).toLocaleString(locale, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC",
  });
}

/** Parse "2026-09-21" from a date input into that calendar day. */
export function toDay(v: string | null | undefined): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** Back into a date input's "YYYY-MM-DD", reading the stored day as UTC. */
export function dayInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

/** Today as a calendar day, from the caller's own clock. */
export function todayDay(now: Date = new Date()): Date {
  return new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00.000Z`);
}

/** Today as "YYYY-MM-DD" from the LOCAL clock — for date-input defaults. */
export function todayInput(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
