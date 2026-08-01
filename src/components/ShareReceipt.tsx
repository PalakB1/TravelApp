"use client";

import { useState } from "react";

// Share the receipt with the customer. On mobile this opens the native share
// sheet (WhatsApp, etc.) and attaches the actual PDF; on desktop it falls back
// to a WhatsApp link / copied message so sharing always works somewhere.
export default function ShareReceipt({ paymentId, customerName, amount, phone }: { paymentId: string; customerName: string; amount: string; phone?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const receiptNo = `RCPT-${paymentId.slice(-6).toUpperCase()}`;

  function buildMessage() {
    const url = `${window.location.origin}/receipt/${paymentId}`;
    const text = `Hi ${customerName}, we've received your payment of ${amount}. Here's your receipt — you can view and download it here: ${url}`;
    return { url, text };
  }

  // Digits only, with a country code so wa.me works. Assume India (91) when the
  // stored number has none. Returns null if there's no usable phone.
  function waNumber(): string | null {
    if (!phone) return null;
    let d = phone.replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10) d = "91" + d; // bare 10-digit Indian mobile
    else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
    return d;
  }

  function copyFallback(text: string) {
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); })
      .catch(() => { window.prompt("Copy this message to send it:", text); });
  }

  async function share() {
    if (busy) return;
    const { url, text } = buildMessage();
    setBusy(true);
    try {
      // 1) Best case (mobile): share the real PDF file via the OS share sheet.
      try {
        const res = await fetch(`/receipt/${paymentId}/pdf`, { cache: "no-store" });
        if (res.ok && typeof navigator.canShare === "function") {
          const blob = await res.blob();
          const file = new File([blob], `${receiptNo}.pdf`, { type: "application/pdf" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Payment receipt", text });
            return;
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // user dismissed the sheet
      }

      // 2) Native share of the message + link (no file attachment support).
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Payment receipt", text, url });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
        }
      }

      // 3) Desktop / unsupported: open WhatsApp if we have a number, else copy.
      const wa = waNumber();
      if (wa) {
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        return;
      }
      copyFallback(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
      <a className="btn sm" href={`/receipt/${paymentId}`} target="_blank" rel="noopener" title="Open the receipt (view + download PDF)">View</a>
      <button type="button" className="btn sm primary" onClick={share} disabled={busy} title="Share the receipt with the customer">
        {busy ? "Sharing…" : copied ? "Copied ✓" : "Share"}
      </button>
    </span>
  );
}
