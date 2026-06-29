// Turns a plain-English sentence into a structured command.
//
// This is the ONLY piece that "understands language". Right now it uses
// rules/regex. Later, swap the body of parseCommand() to call the Claude API
// (return the exact same shape) and everything downstream keeps working.

import { parseAmount } from "./money";

export type Command =
  | { kind: "payment"; customer: string; amount: number; mode: string; note?: string }
  | {
      kind: "booking";
      customer: string;
      phone?: string;
      tripQuery?: string;
      variantQuery?: string;
      pax: number;
      discount: number;
      discountReason?: string;
    }
  | { kind: "trip"; name: string; destination?: string; nights?: number; days?: number; capacity?: number }
  | { kind: "unknown"; reason: string };

const MODES: Record<string, string> = {
  upi: "upi", gpay: "upi", googlepay: "upi", phonepe: "upi", paytm: "upi",
  cash: "cash", card: "card", credit: "card", debit: "card",
  bank: "bank", transfer: "bank", neft: "bank", imps: "bank", rtgs: "bank", cheque: "bank",
};

function detectMode(text: string): string {
  const lower = text.toLowerCase();
  for (const key of Object.keys(MODES)) {
    if (lower.includes(key)) return MODES[key];
  }
  return "upi";
}

// Pull the first money-looking amount out of a string (supports 45k, 1.2l, ₹50,000)
function extractAmount(text: string): number {
  const m = text.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|l|lakh|lakhs|cr|crore|crores)?/i);
  if (!m) return 0;
  const unit = (m[2] || "").toLowerCase().replace(/s$/, "");
  return parseAmount(m[1].replace(/,/g, "") + (unit ? unit[0] : ""));
}

function extractPax(text: string): number {
  const m =
    text.match(/(\d+)\s*(?:pax|people|persons|adults|travellers|travelers|guests|pp)\b/i) ||
    text.match(/\bx\s*(\d+)\b/i) ||
    text.match(/\bfor\s+(\d+)\b/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

export function parseCommand(input: string): Command {
  const text = input.trim();
  if (!text) return { kind: "unknown", reason: "Say something like “Riya paid 40k by UPI”." };
  const lower = text.toLowerCase();

  // ---- PAYMENT ----
  // e.g. "Riya paid 40k by upi", "received 20000 from Mr Khanna", "Khanna balance 50000 cash"
  if (/\b(paid|payment|received|advance|balance|deposit|installment|instalment)\b/.test(lower)) {
    const amount = extractAmount(text);
    let customer = "";
    const from = text.match(/from\s+([a-z][a-z .&'-]+?)(?:\s+(?:by|via|in|cash|upi|card|bank|today|of|for|\d)|$)/i);
    const before = text.match(/^([a-z][a-z .&'-]+?)\s+(?:paid|gave|sent|made)/i);
    if (from) customer = from[1];
    else if (before) customer = before[1];
    customer = customer.replace(/\b(mr|mrs|ms|sir|madam)\b\.?/gi, "").trim();
    if (amount > 0 && customer) {
      return { kind: "payment", customer: titleCase(customer), amount, mode: detectMode(text) };
    }
    if (amount > 0) {
      return { kind: "unknown", reason: "Got the amount, but who paid? Try “Riya paid 40k”." };
    }
  }

  // ---- TRIP ----
  // e.g. "add trip Goa Getaway to Goa, 4 nights 5 days, 20 seats"
  const tripM = lower.match(/^(?:add|new|create)\s+trip\s+(.+)$/i) || lower.match(/^(?:add|create)\s+(?:a\s+)?(.+?)\s+trip\b(.*)$/i);
  if (tripM) {
    const rest = text.replace(/^(?:add|new|create)\s+(?:a\s+)?trip\s+/i, "").replace(/\s+trip\b/i, " ");
    const destM = rest.match(/\bto\s+([a-z][a-z ,]+?)(?:,|\.|\d|$)/i);
    const nightsM = lower.match(/(\d+)\s*n(?:ight)?s?\b/);
    const daysM = lower.match(/(\d+)\s*d(?:ay)?s?\b/);
    const seatsM = lower.match(/(\d+)\s*(?:seats|pax|capacity)\b/);
    let name = rest.split(/\bto\b|,|\d/i)[0].trim();
    if (!name) name = titleCase(rest.slice(0, 40));
    return {
      kind: "trip",
      name: titleCase(name),
      destination: destM ? titleCase(destM[1].trim()) : undefined,
      nights: nightsM ? parseInt(nightsM[1], 10) : undefined,
      days: daysM ? parseInt(daysM[1], 10) : undefined,
      capacity: seatsM ? parseInt(seatsM[1], 10) : undefined,
    };
  }

  // ---- BOOKING ----
  // e.g. "add Riya Sharma to Bali deluxe, 2 pax, 5000 festive discount"
  //      "book Khanna on Goa trip standard for 3"
  if (/\b(book|booking|add)\b/.test(lower)) {
    const pax = extractPax(text);
    const discount = /\bdiscount\b/.test(lower) ? extractAmount(text.replace(/\b(\d+)\s*(?:pax|people|pp|x)\b/gi, "")) : 0;
    const discountReason = (text.match(/([a-z]+)\s+discount/i)?.[1] || "").toLowerCase();

    // customer = words after "book"/"add" up to "to/on/for"
    const nameM = text.match(/\b(?:book|booking|add)\s+(?:a\s+booking\s+for\s+)?([a-z][a-z .]+?)\s+(?:to|on|for|in)\b/i);
    const phoneM = text.match(/(\+?\d[\d ]{7,}\d)/);
    // trip = words after "to/on" up to comma/variant words
    const tripM2 = text.match(/\b(?:to|on|in)\s+([a-z][a-z ]+?)(?:\s+(?:deluxe|standard|premium|luxury|basic)|,|for|\d|$)/i);
    const variantM = lower.match(/\b(deluxe|standard|premium|luxury|basic|single|twin)\b/);

    if (nameM) {
      return {
        kind: "booking",
        customer: titleCase(nameM[1].replace(/\b(mr|mrs|ms)\b\.?/gi, "").trim()),
        phone: phoneM ? phoneM[1].trim() : undefined,
        tripQuery: tripM2 ? tripM2[1].trim() : undefined,
        variantQuery: variantM ? variantM[1] : undefined,
        pax,
        discount,
        discountReason: discountReason || undefined,
      };
    }
  }

  return {
    kind: "unknown",
    reason:
      "Not sure what to do. Try: “add trip Goa Getaway to Goa, 4 nights, 20 seats”, “add Riya to Bali deluxe, 2 pax”, or “Riya paid 40k upi”.",
  };
}
