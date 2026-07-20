"use client";

// Two clearly separate actions: VIEW the receipt (opens the receipt page), or
// SEND it on WhatsApp (pre-filled message + receipt link to the customer).
export default function ShareReceipt({ paymentId, customerName, amount, phone }: { paymentId: string; customerName: string; amount: string; phone?: string | null }) {
  function send() {
    const url = `${window.location.origin}/receipt/${paymentId}`;
    const text = encodeURIComponent(`Hi ${customerName}, we've received your payment of ${amount}. Here's your receipt: ${url}`);
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits;
    window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener");
  }
  return (
    <span className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
      <a className="btn sm" href={`/receipt/${paymentId}`} target="_blank" rel="noopener" title="Open the receipt (view + download PDF)">View</a>
      <button type="button" className="btn sm" onClick={send} title={`Send the receipt to ${customerName} on WhatsApp`} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>WhatsApp</button>
    </span>
  );
}
