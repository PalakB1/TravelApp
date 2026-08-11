// Money is stored as a whole number of the org's currency unit (Int) — rupees,
// pounds, dollars. No minor units anywhere: a booking is 285000, not 28500000.
//
// Formatting is per-organisation, because the same number is "₹1,00,000" to an
// Indian agency and "£100,000" to a British one — note the digit grouping
// differs too, not just the symbol.

export type MoneyCfg = { currency: string; locale: string };

export const INR: MoneyCfg = { currency: "INR", locale: "en-IN" };

// Symbol only, no digits — for input prefixes and column headers.
export function currencySymbol(cfg: MoneyCfg): string {
  try {
    const parts = new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.currency }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? cfg.currency;
  } catch {
    return cfg.currency;
  }
}

// The everyday formatter. Whole units only — nobody bills a tour in pence.
export function formatMoney(amount: number, cfg: MoneyCfg = INR): string {
  const n = Math.round(amount || 0);
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: "currency",
      currency: cfg.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Unknown currency code (someone typed one into Settings) — still show the
    // number rather than crashing the page it appears on.
    return `${cfg.currency} ${n.toLocaleString()}`;
  }
}

// Compact form for metric tiles. India counts in lakh and crore and everyone
// there reads them instantly; everywhere else that would be gibberish, so those
// get K/M instead.
export function formatMoneyShort(amount: number, cfg: MoneyCfg = INR): string {
  const n = Math.round(amount || 0);
  const abs = Math.abs(n);
  const sym = currencySymbol(cfg);
  const trim = (v: string) => v.replace(/\.0+$/, "");

  if (cfg.locale === "en-IN" || cfg.currency === "INR") {
    if (abs >= 1_00_00_000) return sym + trim((n / 1_00_00_000).toFixed(2)) + "Cr";
    if (abs >= 1_00_000) return sym + trim((n / 1_00_000).toFixed(2)) + "L";
    if (abs >= 1000) return sym + trim((n / 1000).toFixed(1)) + "K";
    return formatMoney(n, cfg);
  }
  if (abs >= 1_000_000_000) return sym + trim((n / 1_000_000_000).toFixed(2)) + "B";
  if (abs >= 1_000_000) return sym + trim((n / 1_000_000).toFixed(2)) + "M";
  if (abs >= 1000) return sym + trim((n / 1000).toFixed(1)) + "K";
  return formatMoney(n, cfg);
}

// Legacy names, still used by a few call sites. Always rupees — new code should
// take a MoneyCfg from the organisation instead.
export function formatINR(amount: number): string {
  return formatMoney(amount, INR);
}
export function formatINRShort(amount: number): string {
  return formatMoneyShort(amount, INR);
}

// Tax rates (GST / TCS %) off a form. Three cases have to stay distinct:
//   • absent (null)   — the form doesn't collect a rate at all (Quick entry,
//                       Reports), so fall back to the default.
//   • present + blank — the user deliberately cleared the box. That means ZERO,
//                       not "default": some customers don't pay GST/TCS.
//   • anything else   — what they typed, never negative.
// Rate columns are Int, so round rather than let Prisma reject a float.
export function parseRate(input: unknown, fallback: number): number {
  if (input === null || input === undefined) return fallback;
  const s = String(input).trim();
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

// Shorthand in the amount box: "45k", "1.2l", "2cr". The Indian units are
// accepted everywhere rather than gated on the org's country — an operator
// typing "2l" means 200000 whatever their billing currency is, and refusing it
// would only be surprising.
export function parseAmount(input: string | number | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === "number") return Math.round(input);
  // strip ₹, commas, spaces; support shorthand like 45k, 1.2l, 2cr
  const s = input.toLowerCase().replace(/[^0-9a-z.]/g, "").trim();
  const m = s.match(/^([\d.]+)(k|l|lakh|cr|crore)?$/);
  if (!m) {
    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.round(n);
  }
  let n = parseFloat(m[1]);
  const unit = m[2];
  if (unit === "k") n *= 1000;
  else if (unit === "l" || unit === "lakh") n *= 100000;
  else if (unit === "cr" || unit === "crore") n *= 10000000;
  return Math.round(n);
}
