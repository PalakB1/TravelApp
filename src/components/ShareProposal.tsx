"use client";

// Send the proposal to the customer on WhatsApp — opens WhatsApp with the link
// and a warm message ready, from the user's own number. Same pattern as Remind.
export default function ShareProposal({ proposalId, title, customerName, phone }: { proposalId: string; title: string; customerName?: string | null; phone?: string | null }) {
  function waNumber(): string | null {
    if (!phone) return null;
    let d = phone.replace(/\D/g, "");
    if (!d) return null;
    if (d.length === 10) d = "91" + d;
    else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
    return d;
  }

  function share() {
    const url = `${window.location.origin}/proposal/${proposalId}`;
    const hi = customerName ? `Hi ${customerName}` : "Hi";
    const msg = `${hi}! ✨ Here's your travel proposal — ${title}. Take a look and let me know what you think: ${url}`;
    const wa = waNumber();
    const link = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank", "noopener");
  }

  return (
    <button type="button" className="btn sm primary" onClick={share} title="Send this proposal to the customer on WhatsApp">💬 Send on WhatsApp</button>
  );
}
