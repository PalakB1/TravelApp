import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";

// Item types offered in the à-la-carte builder.
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

// Returns the effective orgId only if the current org has the module enabled; else null.
export async function customOrgId(): Promise<string | null> {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) return null;
  const org = await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { customTripsEnabled: true } });
  return org?.customTripsEnabled ? ctx.orgId : null;
}

// ---- Money math — mirrors the trip GST/TCS formulas (calc.ts) ----
export type ItemLite = { qty: number; cost: number; sell: number; taxable: boolean };
export type CTLite = { items: ItemLite[]; discount?: number; gstRate?: number; tcsRate?: number; payments?: { amount: number }[] };

const line = (i: ItemLite) => i.sell * (i.qty || 1);
export const ctItemsTaxable = (t: CTLite) => t.items.filter((i) => i.taxable).reduce((s, i) => s + line(i), 0);
export const ctItemsNonTax = (t: CTLite) => t.items.filter((i) => !i.taxable).reduce((s, i) => s + line(i), 0);
export const ctTaxable = (t: CTLite) => Math.max(0, ctItemsTaxable(t) - (t.discount || 0));
export const ctGst = (t: CTLite) => Math.round((ctTaxable(t) * (t.gstRate ?? 5)) / 100);
// TCS on taxable + GST, matching the trip billing rule.
export const ctTcs = (t: CTLite) => Math.round(((ctTaxable(t) + ctGst(t)) * (t.tcsRate ?? 2)) / 100);
export const ctTax = (t: CTLite) => ctGst(t) + ctTcs(t);
export const ctTotal = (t: CTLite) => ctTaxable(t) + ctGst(t) + ctTcs(t) + ctItemsNonTax(t); // what the client pays
export const ctRevenue = (t: CTLite) => ctTaxable(t) + ctItemsNonTax(t); // pre-tax sale value
export const ctCost = (t: CTLite) => t.items.reduce((s, i) => s + i.cost * (i.qty || 1), 0);
export const ctProfit = (t: CTLite) => ctRevenue(t) - ctCost(t);
export const ctPaid = (t: CTLite) => (t.payments || []).reduce((s, p) => s + p.amount, 0);
export const ctOutstanding = (t: CTLite) => ctTotal(t) - ctPaid(t);
