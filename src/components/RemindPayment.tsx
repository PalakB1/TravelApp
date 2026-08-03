"use client";

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
}: {
  phone?: string | null;
  customerName: string;
  amount: string; // pre-formatted, e.g. "₹40,000"
  dueLabel?: string | null; // null when they simply carry a balance with no plan date
  tripName: string;
  payPath: string; // e.g. "/pay/abc123"
  overdue?: boolean;
  count?: number; // how many installments this total covers
}) {
  // Digits only, with a country code so wa.me works. Assume India (91) when absent.
  function waNumber(): string | null {
    if (!phone) return null;
    let d = phone.replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10) d = "91" + d;
    else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
    return d;
  }

  function send() {
    const url = `${window.location.origin}${payPath}`;
    const many = count > 1 ? ` (${count} installments)` : "";
    const msg = !dueLabel
      // No scheduled date — just an outstanding balance.
      ? `Hi ${customerName}, a gentle reminder — there's a balance of ${amount} on your ${tripName} trip. You can pay securely here: ${url}`
      : overdue
        ? `Hi ${customerName}, a gentle reminder — a total of ${amount}${many} for your ${tripName} trip is now due (from ${dueLabel}). You can pay securely here: ${url}`
        : `Hi ${customerName}, a friendly reminder — ${amount} for your ${tripName} trip is due on ${dueLabel}. You can pay securely here: ${url}`;
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
