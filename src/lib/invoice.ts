// Pure helpers for GST tax invoices (financial year + amount in words).

// Indian financial year (April–March), e.g. a July-2026 date → "2026-27".
export function financialYear(d: Date): string {
  const y = d.getFullYear();
  const start = d.getMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigit(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}
function threeDigit(n: number): string {
  let s = "";
  if (n > 99) { s += ONES[Math.floor(n / 100)] + " Hundred"; n %= 100; if (n) s += " "; }
  if (n > 0) s += twoDigit(n);
  return s;
}

// Whole rupees → Indian-system words, e.g. 296667 → "Two Lakh Ninety Six Thousand Six Hundred Sixty Seven Rupees Only".
export function amountInWords(num: number): string {
  num = Math.round(Math.abs(num || 0));
  if (num === 0) return "Zero Rupees Only";
  const cr = Math.floor(num / 10000000); num %= 10000000;
  const la = Math.floor(num / 100000); num %= 100000;
  const th = Math.floor(num / 1000); num %= 1000;
  const hu = num;
  const parts: string[] = [];
  if (cr) parts.push(threeDigit(cr) + " Crore");
  if (la) parts.push(twoDigit(la) + " Lakh");
  if (th) parts.push(twoDigit(th) + " Thousand");
  if (hu) parts.push(threeDigit(hu));
  return parts.join(" ").trim() + " Rupees Only";
}
