"use client";

import { toWaNumber } from "@/lib/phone";

// Tap-to-send a gentle heads-up that a customer's free-cancellation window is
// about to close. Opens WhatsApp with the message ready, from the user's own number.
export default function RemindCancelWindow({
  phone,
  customerName,
  tripName,
  dateLabel,
  defaultCc = "91",
}: {
  phone?: string | null;
  customerName: string;
  tripName: string;
  dateLabel: string; // e.g. "20 Sep 2026"
  /** The agency's own dialling code, used only for bare local numbers. */
  defaultCc?: string;
}) {
  // Country code handling lives in one place — see lib/phone.
  const waNumber = () => toWaNumber(phone, defaultCc);

  function send() {
    const msg = `Hi ${customerName}, a quick heads-up on your ${tripName} trip — free cancellation is available until ${dateLabel}. After that, our cancellation terms would apply. Do let us know if you'd like to go ahead; happy to help. 🙂`;
    const wa = waNumber();
    const link = wa
      ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <button type="button" className="btn sm" onClick={send} title="Open WhatsApp with the heads-up ready to send">
      💬 Remind
    </button>
  );
}
