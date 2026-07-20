"use client";

import { useState } from "react";

// View the receipt, or copy a ready-to-send message + link to paste anywhere.
export default function ShareReceipt({ paymentId, customerName, amount }: { paymentId: string; customerName: string; amount: string; phone?: string | null }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const url = `${window.location.origin}/receipt/${paymentId}`;
    const msg = `Hi ${customerName}, we've received your payment of ${amount}. Here's your receipt — you can view and download it here: ${url}`;
    navigator.clipboard.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  }
  return (
    <span className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
      <a className="btn sm" href={`/receipt/${paymentId}`} target="_blank" rel="noopener" title="Open the receipt (view + download PDF)">View</a>
      <button type="button" className="btn sm" onClick={copy} title="Copy the message + link to send anywhere">{copied ? "Copied ✓" : "Copy message"}</button>
    </span>
  );
}
