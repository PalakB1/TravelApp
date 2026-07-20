import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { amountInWords } from "@/lib/invoice";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
export const receiptNo = (id: string) => `RCPT-${id.slice(-6).toUpperCase()}`;

// PUBLIC — a shareable payment receipt for one recorded payment.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.payment.findUnique({
    where: { id },
    include: { booking: { include: { trip: { include: { org: true } }, variant: true, payments: true } } },
  });
  if (!p) notFound();

  const b = p.booking;
  const org = b.trip.org;
  const agency = org?.legalName || org?.name || "Trip Desk";
  const total = bookingTotal(b);
  const paidToDate = bookingPaid(b);
  const balance = bookingBalance(b);

  const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
    <div className="between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)", fontWeight: strong ? 600 : 400 }}>
      <span className="muted small">{l}</span><span style={{ fontSize: 14 }}>{v}</span>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "24px 16px" }}>
      <div style={{ width: 560, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="brand" style={{ paddingLeft: 0 }}><span className="dot">✦</span> {agency}</div>
          <div className="flex" style={{ gap: 8 }}>
            <a className="btn primary sm" href={`/receipt/${p.id}/pdf`} download>⬇ Download PDF</a>
            <PrintButton />
          </div>
        </div>

        <div className="card sheet">
          <div style={{ textAlign: "center", borderBottom: "2px solid var(--border-strong)", paddingBottom: 12, marginBottom: 14 }}>
            {org?.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org.logo} alt="" style={{ height: 48, maxWidth: 170, objectFit: "contain", marginBottom: 8 }} />
            ) : null}
            <div style={{ fontSize: 17, fontWeight: 700 }}>{agency}</div>
            {org?.gstAddress && <div className="small muted">{org.gstAddress}</div>}
            {org?.gstin && <div className="small muted">GSTIN: {org.gstin}</div>}
            <div style={{ marginTop: 10, fontWeight: 700, letterSpacing: "0.08em", fontSize: 13 }}>PAYMENT RECEIPT</div>
          </div>

          <Row l="Receipt no." v={receiptNo(p.id)} />
          <Row l="Receipt date" v={fmt(p.date)} />
          <Row l="Received from" v={b.customerName} />
          <Row l="Towards" v={b.trip.name} />
          <Row l="Payment mode" v={p.mode.toUpperCase()} />
          {p.note && <Row l="Reference / note" v={p.note} />}
          <Row l="Amount received" v={formatINR(p.amount)} strong />

          <p className="small" style={{ margin: "12px 0 16px", fontStyle: "italic" }}>
            Rupees {amountInWords(p.amount).replace(/ Rupees Only$/, "")} only.
          </p>

          <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 12 }}>
            <div className="between small"><span className="muted">Total invoiced</span><span>{formatINR(total)}</span></div>
            <div className="between small" style={{ marginTop: 4 }}><span className="muted">Total received to date</span><span>{formatINR(paidToDate)}</span></div>
            <div className="between" style={{ marginTop: 6, fontWeight: 600 }}><span>Balance outstanding</span><span>{formatINR(balance)}</span></div>
          </div>

          <p className="small muted" style={{ marginTop: 16, textAlign: "center" }}>
            Thank you for your payment. This is a computer-generated receipt and does not require a signature.
          </p>
        </div>
      </div>
    </div>
  );
}
