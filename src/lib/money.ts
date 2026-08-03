// All money is stored as whole rupees (Int). These helpers format for display.

export function formatINR(amount: number): string {
  const n = Math.round(amount || 0);
  return "₹" + n.toLocaleString("en-IN");
}

// Compact form for big metric numbers, e.g. ₹8.4L, ₹1.2Cr
export function formatINRShort(amount: number): string {
  const n = Math.round(amount || 0);
  const abs = Math.abs(n);
  if (abs >= 10000000) return "₹" + (n / 10000000).toFixed(2).replace(/\.00$/, "") + "Cr";
  if (abs >= 100000) return "₹" + (n / 100000).toFixed(2).replace(/\.00$/, "") + "L";
  if (abs >= 1000) return "₹" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return "₹" + n.toLocaleString("en-IN");
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

export function parseAmount(input: string | number | null | undefined): number {
  if (input == null) return 0;
  if (typeof input === "number") return Math.round(input);
  // strip ₹, commas, spaces; support shorthand like 45k, 1.2l, 2cr
  const s = input.toLowerCase().replace(/[₹,\s]/g, "").trim();
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
