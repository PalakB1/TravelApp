import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingTaxable, bookingGst, bookingTcs, bookingTotal, bookingPaid, bookingBalance, bookingInclNonTaxCharge } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { amountInWords } from "@/lib/invoice";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { trip: { include: { org: true } }, variant: true, payments: true, inclusions: true, customer: true },
  });
  if (!b) notFound();
  const org = b.trip.org;
  const agency = org?.legalName || org?.name || "Trip Desk";

  if (!b.invoiceNo) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🧾</div>
          <h2 style={{ fontSize: 17 }}>Invoice not generated yet</h2>
          <p className="muted small">This booking’s tax invoice hasn’t been generated. The agency can create it from the booking, then share this link.</p>
        </div>
      </div>
    );
  }

  const taxable = bookingTaxable(b);
  const gst = bookingGst(b);
  const tcs = bookingTcs(b);
  const nonTax = (b.nonTaxable || 0) + bookingInclNonTaxCharge(b);
  const total = bookingTotal(b);
  const paid = bookingPaid(b);
  const balance = bookingBalance(b);
  const gstHalf = Math.round(gst / 2);
  const rate = b.gstRate ?? 5;

  const Cell = ({ children, num, head, bold }: { children: React.ReactNode; num?: boolean; head?: boolean; bold?: boolean }) => (
    <td style={{ padding: "7px 10px", borderBottom: "1px solid var(--border)", textAlign: num ? "right" : "left", fontWeight: head || bold ? 600 : 400, fontSize: head ? 11 : 13, color: head ? "var(--text-2)" : "var(--text)", textTransform: head ? "uppercase" : "none" }}>{children}</td>
  );

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "24px 16px" }}>
      <div style={{ width: 620, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="brand" style={{ paddingLeft: 0 }}><span className="dot">✦</span> {agency}</div>
          <div className="flex" style={{ gap: 8 }}>
            <a className="btn primary sm" href={`/invoice/${b.id}/pdf`} download>⬇ Download PDF</a>
            <PrintButton />
          </div>
        </div>

        <div className="card sheet">
          {/* header */}
          <div className="between" style={{ borderBottom: "2px solid var(--border-strong)", paddingBottom: 12, marginBottom: 4, alignItems: "flex-start", gap: 12 }}>
            <div className="flex" style={{ gap: 12, alignItems: "center" }}>
              {org?.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={org.logo} alt="" style={{ height: 46, maxWidth: 120, objectFit: "contain" }} />
              ) : null}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{agency}</div>
                {org?.gstAddress && <div className="small muted">{org.gstAddress}</div>}
                {org?.gstin && <div className="small muted">GSTIN: {org.gstin}{org.gstState ? ` · ${org.gstState}${org.gstStateCode ? ` (${org.gstStateCode})` : ""}` : ""}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, letterSpacing: "0.06em" }}>TAX INVOICE</div>
              <div className="small muted">{b.invoiceNo}</div>
              <div className="small muted">{fmt(b.invoiceDate || b.createdAt)}</div>
            </div>
          </div>

          {/* bill to */}
          <div style={{ margin: "12px 0" }}>
            <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Bill to</div>
            <div style={{ fontWeight: 600 }}>{b.customerName}</div>
            <div className="small muted">{[b.customer?.phone, b.customer?.email].filter(Boolean).join(" · ")}</div>
            <div className="small muted">Trip: {b.trip.name} · {b.pax} traveller{b.pax === 1 ? "" : "s"}</div>
          </div>

          {/* items */}
          <table className="t" style={{ marginTop: 6 }}>
            <thead><tr><Cell head>Description</Cell><Cell head>SAC</Cell><Cell head num>Taxable value</Cell></tr></thead>
            <tbody>
              <tr><Cell>Tour / travel package — {b.trip.name}{b.discount ? " (after discount)" : ""}</Cell><Cell>{org?.sacCode || "998555"}</Cell><Cell num>{formatINR(taxable)}</Cell></tr>
              {nonTax > 0 && <tr><Cell>Other charges (non-taxable — e.g. embassy/visa fee)</Cell><Cell>—</Cell><Cell num>{formatINR(nonTax)}</Cell></tr>}
            </tbody>
          </table>

          {/* totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <table style={{ width: 300 }}>
              <tbody>
                <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>Taxable value</td><td style={{ textAlign: "right" }}>{formatINR(taxable)}</td></tr>
                <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>CGST @ {rate / 2}%</td><td style={{ textAlign: "right" }}>{formatINR(gstHalf)}</td></tr>
                <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>SGST @ {rate / 2}%</td><td style={{ textAlign: "right" }}>{formatINR(gst - gstHalf)}</td></tr>
                <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>TCS @ {b.tcsRate ?? 2}%</td><td style={{ textAlign: "right" }}>{formatINR(tcs)}</td></tr>
                {nonTax > 0 && <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>Non-taxable</td><td style={{ textAlign: "right" }}>{formatINR(nonTax)}</td></tr>}
                <tr style={{ borderTop: "1px solid var(--border-strong)", fontWeight: 700 }}><td style={{ padding: "6px 0" }}>Total</td><td style={{ textAlign: "right" }}>{formatINR(total)}</td></tr>
                <tr><td style={{ padding: "3px 0", color: "var(--text-2)" }}>Received</td><td style={{ textAlign: "right", color: "var(--text-2)" }}>−{formatINR(paid)}</td></tr>
                <tr style={{ fontWeight: 700 }}><td style={{ padding: "3px 0" }}>Balance due</td><td style={{ textAlign: "right" }}>{formatINR(balance)}</td></tr>
              </tbody>
            </table>
          </div>

          <p className="small" style={{ marginTop: 14, fontStyle: "italic" }}>Amount chargeable (in words): Rupees {amountInWords(total).replace(/ Rupees Only$/, "")} only.</p>
          <p className="small muted" style={{ marginTop: 6 }}>CGST/SGST shown assuming intra-state supply. {org?.invoiceNote || "This is a computer-generated invoice."}</p>
          <p className="small muted" style={{ marginTop: 10, textAlign: "right" }}>For {agency}</p>
        </div>
      </div>
    </div>
  );
}
