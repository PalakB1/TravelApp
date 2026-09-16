import { cache } from "react";
import { getOrg } from "@/lib/org";
import { formatMoney, formatMoneyShort, currencySymbol, INR, type MoneyCfg } from "@/lib/money";
import { countryPreset } from "@/lib/countries";

// How the signed-in agency writes money and names its taxes.
//
// Pages call `const $ = await orgMoney()` once and then use `$.fmt(x)` in place
// of the old formatINR. The lookup is wrapped in React's cache(), so it costs
// one query per request no matter how many components ask for it.

export type OrgMoney = {
  cfg: MoneyCfg;
  symbol: string;
  /** Full amount, e.g. ₹1,00,000 or £100,000 */
  fmt: (n: number) => string;
  /** Compact, for metric tiles: ₹8.40L, £2.50M */
  short: (n: number) => string;
  /** What this agency's sales tax is called — GST, VAT, IVA… */
  taxLabel: string;
  /** A second levy. Empty outside India, and the UI hides it when empty. */
  taxLabel2: string;
  taxRate: number;
  taxRate2: number;
  /** What the tax registration number is called — GSTIN, VAT number… */
  taxIdLabel: string;
  /** Dialling code for the agency's country, for WhatsApp links. */
  dial: string;
};

export function buildMoney(org: {
  country?: string | null;
  currency?: string | null;
  locale?: string | null;
  taxLabel?: string | null;
  taxLabel2?: string | null;
  taxRate?: number | null;
  taxRate2?: number | null;
  taxIdLabel?: string | null;
} | null | undefined): OrgMoney {
  const cfg: MoneyCfg = {
    currency: org?.currency || INR.currency,
    locale: org?.locale || INR.locale,
  };
  return {
    cfg,
    symbol: currencySymbol(cfg),
    fmt: (n: number) => formatMoney(n, cfg),
    short: (n: number) => formatMoneyShort(n, cfg),
    taxLabel: org?.taxLabel || "GST",
    taxLabel2: org?.taxLabel2 ?? "TCS",
    taxRate: org?.taxRate ?? 5,
    taxRate2: org?.taxRate2 ?? 2,
    taxIdLabel: org?.taxIdLabel || "GSTIN",
    dial: countryPreset(org?.country).dial,
  };
}

// Shares getOrg's single cached row rather than fetching the same organisation
// a second time on every page.
export const orgMoney = cache(async (): Promise<OrgMoney> => buildMoney(await getOrg()));
