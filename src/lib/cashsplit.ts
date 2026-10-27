// Splitting one agreed, all-in price into the part that appears on a tax
// invoice and the part that does not.
//
// The arithmetic that matters here is that tax comes OUT of the agreed total
// rather than being added on top. The customer has agreed to hand over one
// number; if the invoice side were taxed on top of its share, the two halves
// would add up to more than was agreed, and the gap only shows up when someone
// reconciles the books months later.
export type Split = {
  /** Off-invoice. No sales tax, no second levy. */
  cash: number;
  /** What the invoice comes to in total, tax included. */
  grossBilled: number;
  /** The value the tax is charged on — what goes in "Land cost". */
  taxable: number;
  tax: number;
  tax2: number;
  /** cash + grossBilled. Equals the agreed total exactly. */
  total: number;
};

export function splitCash(
  agreed: number,
  sharePct: number,
  side: "cash" | "billed",
  rate1: number,
  rate2: number,
): Split {
  const agreedN = Math.max(0, Math.round(agreed || 0));
  const share = Math.min(100, Math.max(0, sharePct || 0));
  const billedShare = side === "cash" ? 100 - share : share;

  const grossBilled = Math.round((agreedN * billedShare) / 100);
  const cash = agreedN - grossBilled;

  const rate = ((rate1 || 0) + (rate2 || 0)) / 100;
  const base = rate > 0 ? Math.round(grossBilled / (1 + rate)) : grossBilled;
  const tax = Math.round((base * (rate1 || 0)) / 100);
  const tax2 = Math.round((base * (rate2 || 0)) / 100);

  // Three separate roundings can leave the parts a rupee or two short of the
  // gross. The invoice has to add up, so the remainder goes on the taxable
  // line — the only one of the three that isn't a published rate times a base.
  const taxable = base + (grossBilled - (base + tax + tax2));

  return { cash, grossBilled, taxable, tax, tax2, total: cash + grossBilled };
}
