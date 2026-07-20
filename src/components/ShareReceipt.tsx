"use client";

// Compact per-row control: open the receipt, or send it straight on WhatsApp.
export default function ShareReceipt({ paymentId, customerName, amount, phone }: { paymentId: string; customerName: string; amount: string; phone?: string | null }) {
  function send() {
    const url = `${window.location.origin}/receipt/${paymentId}`;
    const text = encodeURIComponent(`Hi ${customerName}, we've received your payment of ${amount}. Here's your receipt: ${url}`);
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits;
    window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener");
  }
  return (
    <span className="flex" style={{ gap: 6, justifyContent: "flex-end" }}>
      <a className="sm" href={`/receipt/${paymentId}`} target="_blank" rel="noopener">Receipt</a>
      <button type="button" className="sm" onClick={send} title={`Send receipt to ${customerName}`} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>↗</button>
    </span>
  );
}
