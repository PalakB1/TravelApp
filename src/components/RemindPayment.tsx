"use client";

import { toWaNumber } from "@/lib/phone";

// Tap-to-send a payment reminder on WhatsApp. Opens WhatsApp on the user's phone
// with the message ready — they just press send, so it goes from their own number.
export default function RemindPayment({
  phone,
  customerName,
  amount,
  dueLabel,
  tripName,
  payPath,
  overdue = false,
  count = 1,
  defaultCc = "91",
}: {
  phone?: string | null;
  customerName: string;
  amount: string; // pre-formatted, e.g. "₹40,000"
  dueLabel?: string | null; // null when they simply carry a balance with no plan date
  tripName: string;
  payPath: string; // e.g. "/pay/abc123"
  overdue?: boolean;
  count?: number; // how many installments this total covers
  /** The agency's own dialling code, used only for bare local numbers. */
  defaultCc?: string;
}) {
  // Country code handling lives in one place — see lib/phone.
  const waNumber = () => toWaNumber(phone, defaultCc);

  function send() {
    const url = `${window.location.origin}${payPath}`;
    const many = count > 1 ? ` (${count} installments)` : "";
    // The link does NOT take payment — it's where the customer confirms a payment
    // they've already made and uploads the proof. Say so, or they'll open it
    // expecting a checkout.
    const confirmLine = `Once you've made the payment, please confirm it here (you can upload the receipt): ${url}`;
    // The date must read unmistakably as a PAYMENT date. An earlier version said
    // "...for your Iceland trip is due, starting 26 Aug", and customers read that
    // as the trip starting on the 26th. So the payment is the subject of its own
    // sentence, the date never sits next to the trip name, and the word
    // "booking" is used for the thing being paid for — a trip has travel dates,
    // a booking has a bill.
    const msg = !dueLabel
      // No scheduled date — just an outstanding balance.
      ? `Hi ${customerName}, a gentle reminder about your booking for ${tripName}. There's a balance of ${amount} still to pay. ${confirmLine}`
      : overdue
        // The total can mix instalments already late with ones falling due
        // shortly, so it says which one the date belongs to rather than
        // claiming the whole amount is overdue.
        ? `Hi ${customerName}, a gentle reminder about your booking for ${tripName}. A payment of ${amount}${many} is still pending — the earliest installment was due on ${dueLabel}. ${confirmLine}`
        : `Hi ${customerName}, a gentle reminder about your booking for ${tripName}. Your next payment of ${amount} is due on ${dueLabel}. ${confirmLine}`;
    const wa = waNumber();
    const link = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`; // no number on file → pick the chat
    window.open(link, "_blank", "noopener");
  }

  return (
    <button type="button" className="btn sm" onClick={send} title="Open WhatsApp with the reminder ready to send">
      💬 Remind
    </button>
  );
}
