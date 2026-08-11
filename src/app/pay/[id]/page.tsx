import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";

import PayForm from "./PayForm";
import { STANDARD_REFUND_POLICY } from "@/lib/policy";
import PoweredBy from "@/components/PoweredBy";
import Logo from "@/components/Logo";
import { buildMoney } from "@/lib/orgMoney";

export const dynamic = "force-dynamic";

export default async function PublicPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { trip: { select: { name: true, destination: true, org: { select: { defaultRefundPolicy: true, hideBranding: true, currency: true, locale: true, taxLabel: true, taxLabel2: true, taxRate: true, taxRate2: true, taxIdLabel: true } } } }, payments: true },
  });
  if (!b) notFound();

  const $ = buildMoney(b.trip.org);
  const total = bookingTotal(b);
  const paid = bookingPaid(b);
  const balance = bookingBalance(b);
  // Booking's own wording wins; else the org default; else the standard terms.
  const policy = b.refundPolicy ?? b.trip.org?.defaultRefundPolicy ?? STANDARD_REFUND_POLICY;

  return (
    <div className="doc-light" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 460, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}>
          <Logo plain />
        </div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>Confirm your payment</h1>
        <p className="muted small" style={{ marginTop: 4 }}>Hi {b.customerName} — for <b>{b.trip.name}</b>{b.trip.destination ? ` (${b.trip.destination})` : ""}.</p>
        <p className="small" style={{ marginTop: 6, background: "var(--accent-bg)", color: "var(--accent)", padding: "8px 11px", borderRadius: 9 }}>
          This page doesn&apos;t take payment. Once you&apos;ve paid us, tell us the details below and we&apos;ll match it to your booking.
        </p>

        <div className="metrics" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 16, marginBottom: 18 }}>
          <div className="metric c-violet"><div className="label">Invoice</div><div className="value" style={{ fontSize: 17 }}>{$.fmt(total)}</div></div>
          <div className="metric c-emerald"><div className="label">Paid</div><div className="value" style={{ fontSize: 17 }}>{$.fmt(paid)}</div></div>
          <div className={`metric ${balance > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Balance</div><div className="value" style={{ fontSize: 17 }}>{$.fmt(balance)}</div></div>
        </div>

        <PayForm bookingId={b.id} customerName={b.customerName} suggested={balance > 0 ? balance : undefined} symbol={$.symbol} />

        {/* Terms are available but collapsed — the payment form stays the focus. */}
        {policy && (
          <details style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <summary className="small muted" style={{ cursor: "pointer" }}>Cancellation &amp; refund policy</summary>
            <div className="small muted" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 10 }}>{policy}</div>
          </details>
        )}
        <PoweredBy hide={b.trip.org?.hideBranding} />
      </div>
    </div>
  );
}
