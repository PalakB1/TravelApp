// Payment-plan maths. Installments aren't tied to specific payments — instead the
// total money received "fills" the plan in due-date order (advance first, then the
// next line, …). Each line then reads paid / partly-paid / due / overdue from what's
// left of that running total.

export type ScheduleItemLite = {
  id: string;
  label: string;
  amount: number;
  dueDate: Date | null;
  order: number;
};

export type ScheduleLineStatus = {
  item: ScheduleItemLite;
  /** What this line can actually ask for, once the invoice total is applied. */
  effectiveAmount: number;
  paidHere: number; // how much of this line the received money covers
  remaining: number; // still owed on this line
  covered: boolean; // fully paid (or nothing left to ask for)
  overdue: boolean; // not fully paid and the due date has passed
  /** The invoice was already fully accounted for before this line — it asks for nothing. */
  beyondInvoice: boolean;
};

// Sort by the plan's own step sequence (advance first, then 2nd, 3rd…). We fill
// received money oldest-obligation-first in THIS order, not by due date — so a
// paid advance credits the advance even if a later installment happens to carry
// an earlier (or past) due date. Due date is only the reminder date, not the
// fill order. Ties fall back to the earliest due date.
export function sortSchedule<T extends { dueDate: Date | null; order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return at - bt;
  });
}

// A plan can fall out of step with the invoice — the price is edited after the
// plan was applied, or a plan built for a different total gets assigned. When
// that happens the invoice wins: it is what the customer actually agreed to pay,
// and the plan is only a schedule for collecting it.
//
// So each line is capped at whatever is left of the invoice once the lines
// before it are accounted for. A customer who has paid their invoice in full is
// never shown as behind, however stale the plan is. Without this, a plan built
// for 2,08,950 against a 99,000 invoice reported 1,09,950 overdue from someone
// who had paid every rupee they owed.
export function scheduleStatus(
  items: ScheduleItemLite[],
  totalPaid: number,
  opts: { invoiceTotal?: number | null; now?: Date } = {},
): ScheduleLineStatus[] {
  const sorted = sortSchedule(items);
  const today = (opts.now ?? new Date()).getTime();
  const cap = opts.invoiceTotal != null && opts.invoiceTotal >= 0 ? opts.invoiceTotal : null;

  let pool = Math.max(0, totalPaid);
  let claimed = 0; // how much of the invoice the earlier lines already ask for

  return sorted.map((item) => {
    const headroom = cap == null ? item.amount : Math.max(0, cap - claimed);
    const effectiveAmount = Math.min(item.amount, headroom);
    claimed += effectiveAmount;

    const paidHere = Math.max(0, Math.min(effectiveAmount, pool));
    pool -= paidHere;
    const remaining = effectiveAmount - paidHere;
    const covered = remaining <= 0;
    const overdue = !covered && item.dueDate != null && new Date(item.dueDate).getTime() < today;
    const beyondInvoice = cap != null && effectiveAmount === 0 && item.amount > 0;
    return { item, effectiveAmount, paidHere, remaining, covered, overdue, beyondInvoice };
  });
}

// Sum of every installment (what the plan expects to collect in total).
export function scheduleTotal(items: { amount: number }[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}

// Split one amount across several items in proportion to `weights`, in whole
// rupees, guaranteeing the parts add back to exactly the whole.
//
// Used when a single supplier invoice covers several hotel nights: each night
// takes its share so the trip still reconciles night by night. Naive rounding
// loses or invents a rupee or two, which then shows up as a phantom variance —
// so the last item absorbs whatever the rounding left over.
export function apportion(amount: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  // No usable weights (everything estimated at zero) → split it evenly.
  const shares = total > 0
    ? weights.map((w) => Math.round((amount * Math.max(0, w)) / total))
    : weights.map(() => Math.round(amount / n));
  const drift = amount - shares.reduce((s, v) => s + v, 0);
  shares[n - 1] += drift;
  return shares;
}

// How far ahead a payment counts as worth chasing.
//
// Reminders used to fire only once money was already late, which is the worst
// moment to ask: the customer is embarrassed and you're chasing rather than
// prompting. Looking a little way forward turns it into a nudge before the date
// instead of a complaint after it.
export const DUE_SOON_DAYS = 10;

/**
 * True when `dueDate` is already past OR falls within the next `days`.
 * Compared on whole days, so an installment due today always counts.
 */
export function isDueWithin(dueDate: Date | null | undefined, now: Date, days: number = DUE_SOON_DAYS): boolean {
  if (!dueDate) return false;
  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  // Stepping the date rather than adding milliseconds keeps this right across a
  // daylight-saving change, where a "day" isn't 24 hours.
  const limit = dayStart(now);
  limit.setDate(limit.getDate() + days);
  return dayStart(new Date(dueDate)).getTime() <= limit.getTime();
}
