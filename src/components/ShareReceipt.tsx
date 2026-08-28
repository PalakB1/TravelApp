"use client";

import { toWaNumber } from "@/lib/phone";

// Share a receipt with the customer — opens WhatsApp with the message + receipt
// link ready to send, from the user's own number (same behaviour as the payment
// Remind button). If there's no phone on file, WhatsApp opens to pick a chat.
export default function ShareReceipt({ paymentId, customerName, amount, phone, defaultCc = "91" }: { paymentId: string; customerName: string; amount: string; phone?: string | null; defaultCc?: string }) {
  // Country code handling lives in one place — see lib/phone.
  const waNumber = () => toWaNumber(phone, defaultCc);

  function share() {
    const url = `${window.location.origin}/receipt/${paymentId}`;
    const msg = `Hi ${customerName}, we've received your payment of ${amount}. Here's your receipt — you can view and download it here: ${url}`;
    const wa = waNumber();
    const link = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <span className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
      <a className="btn sm" href={`/receipt/${paymentId}`} target="_blank" rel="noopener" title="Open the receipt (view + download PDF)">View</a>
      <button type="button" className="btn sm primary" onClick={share} title="Open WhatsApp with the receipt ready to send">💬 Share</button>
    </span>
  );
}
