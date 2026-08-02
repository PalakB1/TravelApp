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
  paidHere: number; // how much of this line the received money covers
  remaining: number; // still owed on this line
  covered: boolean; // fully paid
  overdue: boolean; // not fully paid and the due date has passed
};

// Sort by due date (undated lines last), then by explicit order.
export function sortSchedule<T extends { dueDate: Date | null; order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (at !== bt) return at - bt;
    return a.order - b.order;
  });
}

export function scheduleStatus(items: ScheduleItemLite[], totalPaid: number, now: Date = new Date()): ScheduleLineStatus[] {
  const sorted = sortSchedule(items);
  const today = now.getTime();
  let pool = Math.max(0, totalPaid);
  return sorted.map((item) => {
    const paidHere = Math.max(0, Math.min(item.amount, pool));
    pool -= paidHere;
    const remaining = item.amount - paidHere;
    const covered = remaining <= 0;
    const overdue = !covered && item.dueDate != null && new Date(item.dueDate).getTime() < today;
    return { item, paidHere, remaining, covered, overdue };
  });
}

// Sum of every installment (what the plan expects to collect in total).
export function scheduleTotal(items: { amount: number }[]): number {
  return items.reduce((s, i) => s + i.amount, 0);
}
