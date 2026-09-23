// Pure custom-trip constants + money math (no server imports, so it's unit-testable).
// lib.ts re-exports everything here and adds the server-only customOrgId guard.
//
// The GST/TCS chain is NOT redefined here — it comes from lib/calc, the same one
// package bookings use, so the two can't drift. Relative import rather than "@/"
// because vitest resolves this file without the tsconfig path alias.
import { taxOn, billOn } from "../../../lib/calc";

export const ITEM_TYPES = [
  { value: "flight", label: "Flight", icon: "✈️" },
  { value: "hotel", label: "Hotel", icon: "🏨" },
  { value: "transfer", label: "Transfer", icon: "🚐" },
  { value: "activity", label: "Activity", icon: "🎟️" },
  { value: "rail", label: "Rail", icon: "🚆" },
  { value: "cruise", label: "Cruise", icon: "🚢" },
  { value: "visa", label: "Visa", icon: "🛂" },
  { value: "insurance", label: "Insurance", icon: "🛡️" },
  { value: "package", label: "Package", icon: "📦" },
  { value: "other", label: "Other", icon: "•" },
] as const;
export const ITEM_LABEL: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.label]));
export const ITEM_ICON: Record<string, string> = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t.icon]));
export const CT_STATUS = ["enquiry", "confirmed", "travelled", "cancelled"] as const;

export type ItemLite = { qty: number; cost: number; sell: number; taxable: boolean };
export type CTLite = { items: ItemLite[]; discount?: number; gstRate?: number; tcsRate?: number; payments?: { amount: number }[] };

const line = (i: ItemLite) => i.sell * (i.qty || 1);
export const ctItemsTaxable = (t: CTLite) => t.items.filter((i) => i.taxable).reduce((s, i) => s + line(i), 0);
export const ctItemsNonTax = (t: CTLite) => t.items.filter((i) => !i.taxable).reduce((s, i) => s + line(i), 0);
export const ctTaxable = (t: CTLite) => Math.max(0, ctItemsTaxable(t) - (t.discount || 0));
export const ctGst = (t: CTLite) => taxOn(ctTaxable(t), t).gst;
export const ctTcs = (t: CTLite) => taxOn(ctTaxable(t), t).tcs;
export const ctTax = (t: CTLite) => taxOn(ctTaxable(t), t).tax;
export const ctTotal = (t: CTLite) => billOn(ctTaxable(t), ctItemsNonTax(t), t).total; // what the client pays
export const ctRevenue = (t: CTLite) => billOn(ctTaxable(t), ctItemsNonTax(t), t).revenue; // pre-tax sale value
export const ctCost = (t: CTLite) => t.items.reduce((s, i) => s + i.cost * (i.qty || 1), 0);
export const ctProfit = (t: CTLite) => ctRevenue(t) - ctCost(t);
export const ctPaid = (t: CTLite) => (t.payments || []).reduce((s, p) => s + p.amount, 0);
export const ctOutstanding = (t: CTLite) => ctTotal(t) - ctPaid(t);
