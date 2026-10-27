// What a quotation adds up to.
//
// Deliberately simpler than an invoice. A quote has no payments, no TCS and no
// discount field — if you want to show a discount you put it on as a line with
// a negative price, which is also how it should read to the client. What it
// does have is a taxable/non-taxable split per line, because the things an
// agency passes through at cost — embassy fees, insurance — are not taxed the
// same way as the package, and a quote that hides that gets argued about later.

export type QuoteLine = {
  label: string;
  detail?: string | null;
  qty: number;
  unitPrice: number;
  taxable: boolean;
};

export type QuoteTotals = {
  /** Lines the sales tax applies to, before tax. */
  taxableBase: number;
  /** Lines it doesn't — visa fees, embassy charges, anything at cost. */
  nonTaxable: number;
  tax: number;
  /** What the client pays. */
  total: number;
  /** Per head, when the quote says how many people it is for. */
  perPerson: number | null;
};

export const lineTotal = (l: Pick<QuoteLine, "qty" | "unitPrice">) =>
  Math.round((Number(l.qty) || 0) * (Number(l.unitPrice) || 0));

export function quoteTotals(lines: QuoteLine[], taxRate: number, pax = 0): QuoteTotals {
  let taxableBase = 0;
  let nonTaxable = 0;
  for (const l of lines) {
    const amount = lineTotal(l);
    if (l.taxable) taxableBase += amount;
    else nonTaxable += amount;
  }
  // Tax is added ON TOP here, unlike the cash splitter — a quote states a price
  // and then what the tax on it will be, which is what a client expects to see
  // broken out rather than buried in the number.
  const tax = Math.round((taxableBase * (Number(taxRate) || 0)) / 100);
  const total = taxableBase + nonTaxable + tax;
  const people = Math.max(0, Math.floor(pax) || 0);
  return {
    taxableBase,
    nonTaxable,
    tax,
    total,
    perPerson: people > 0 ? Math.round(total / people) : null,
  };
}

/** Has the quote run out? A quote with no date set never expires. */
export function quoteExpired(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  // Valid "until" the stated day means that whole day counts.
  const end = new Date(validUntil);
  end.setUTCHours(23, 59, 59, 999);
  return now.getTime() > end.getTime();
}

/** What the agency sees on the row: draft, live, expired, accepted, declined. */
export function quoteState(
  q: { status: string; validUntil?: Date | null },
  now = new Date(),
): { label: string; tone: string } {
  if (q.status === "accepted") return { label: "accepted", tone: "green" };
  if (q.status === "declined") return { label: "declined", tone: "red" };
  if (q.status === "draft") return { label: "draft", tone: "gray" };
  if (quoteExpired(q.validUntil, now)) return { label: "expired", tone: "amber" };
  return { label: "sent", tone: "sky" };
}
