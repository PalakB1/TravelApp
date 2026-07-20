"use client";

// Send the GST tax invoice link to the customer on WhatsApp.
export default function ShareInvoice({ bookingId, customerName, invoiceNo, phone }: { bookingId: string; customerName: string; invoiceNo: string; phone?: string | null }) {
  function send() {
    const url = `${window.location.origin}/invoice/${bookingId}`;
    const text = encodeURIComponent(`Hi ${customerName}, here's your tax invoice ${invoiceNo}: ${url}`);
    let digits = (phone || "").replace(/\D/g, "");
    if (digits.length === 10) digits = "91" + digits;
    window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener");
  }
  return (
    <button type="button" className="btn sm" onClick={send} title={`Send invoice to ${customerName} on WhatsApp`} style={{ background: "#25D366", color: "#fff", borderColor: "transparent", fontWeight: 600 }}>↗ WhatsApp</button>
  );
}
