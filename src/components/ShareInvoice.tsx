"use client";

import { useState } from "react";

// Copy a ready-to-send message + invoice link to paste anywhere.
export default function ShareInvoice({ bookingId, customerName, invoiceNo }: { bookingId: string; customerName: string; invoiceNo: string; phone?: string | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/invoice/${bookingId}`;
    const msg = `Hi ${customerName}, here's your tax invoice ${invoiceNo} — you can view and download it here: ${url}`;
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  }
  return (
    <button type="button" className="btn sm" onClick={copy} title="Copy the message + invoice link to send anywhere">{copied ? "Copied ✓" : "Copy message"}</button>
  );
}
