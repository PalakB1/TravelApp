import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/org";
import { formatINR } from "@/lib/money";
import { amountInWords } from "@/lib/invoice";
import { bookingBase, bookingTaxable, bookingGst, bookingTcs, bookingTotal, bookingInclTaxCharge, bookingInclNonTaxCharge } from "@/lib/calc";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const PKG: Record<string, string> = { land: "Tour package (land)", lva: "Land + visa package", full: "Full package" };
function fmt(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await requireOrgId();
  const b = await prisma.booking.findFirst({
    where: { id, trip: { orgId } },
    include: { trip: { select: { name: true, departureDate: true, endDate: true } }, customer: { select: { email: true } } },
  });
  if (!b) notFound();
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, legalName: true, gstin: true, gstAddress: true, gstState: true, gstStateCode: true, sacCode: true, invoiceNote: true } });

  const taxable = bookingTaxable(b);
  const gst = bookingGst(b);
  const cgst = Math.round(gst / 2);
  const sgst = gst - cgst;
  const tcs = bookingTcs(b);
  const nonTax = (b.nonTaxable || 0) + bookingInclNonTaxCharge(b);
  const total = bookingTotal(b);

  // Taxable line breakdown
  const lines: { label: string; amount: number }[] = [];
  const items = (b.landAmount || 0) + (b.visaAmount || 0) + (b.flightAmount || 0);
  if (items > 0) {
    if (b.landAmount) lines.push({ label: PKG[b.packageType] || "Tour package", amount: b.landAmount });
    if (b.visaAmount) lines.push({ label: "Visa assistance service", amount: b.visaAmount });
    if (b.flightAmount) lines.push({ label: "Air tickets", amount: b.flightAmount });
  } else {
    lines.push({ label: `Tour package — ${b.trip.name}`, amount: bookingBase(b) });
  }
  if (bookingInclTaxCharge(b) > 0) lines.push({ label: "Add-on inclusions", amount: bookingInclTaxCharge(b) });
  if (b.travellerExtra) lines.push({ label: "Per-traveller supplements", amount: b.travellerExtra });
  if (b.discount) lines.push({ label: "Less: discount", amount: -b.discount });

  return (
    <div style={{ minHeight: "100vh", padding: "12px 16px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: 720, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <Link href={`/bookings/${b.id}`} className="small muted" style={{ color: "var(--text-2)" }}>← Back to booking</Link>
          <PrintButton />
        </div>

        {!b.invoiceNo && (
          <div className="empty-cta no-print" style={{ borderColor: "var(--warning)", marginBottom: 12 }}>
            <div className="t">No invoice number yet</div>
            <div className="d">Go back to the booking and click “Generate GST invoice” to assign a serial number, then print.</div>
          </div>
        )}
        {!org?.gstin && (
          <div className="empty-cta no-print" style={{ borderColor: "var(--warning)", marginBottom: 12 }}>
            <div className="t">Add your GST details</div>
            <div className="d">Fill your GSTIN, legal name and address under <Link href="/settings">Settings → Business &amp; GST details</Link> so they appear on the invoice.</div>
          </div>
        )}

        <div className="card sheet" style={{ padding: 28 }}>
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", marginBottom: 14 }}>TAX INVOICE</div>

          <div className="between" style={{ alignItems: "flex-start", gap: 20, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{org?.legalName || org?.name}</div>
              {org?.gstAddress && <div className="muted" style={{ marginTop: 2 }}>{org.gstAddress}</div>}
              {org?.gstin && <div style={{ marginTop: 4 }}><b>GSTIN:</b> {org.gstin}</div>}
              {(org?.gstState || org?.gstStateCode) && <div><b>State:</b> {org?.gstState} {org?.gstStateCode ? `(${org.gstStateCode})` : ""}</div>}
            </div>
            <div style={{ fontSize: 13, textAlign: "right", whiteSpace: "nowrap" }}>
              <div><b>Invoice #:</b> {b.invoiceNo || "—"}</div>
              <div><b>Date:</b> {fmt(b.invoiceDate)}</div>
              <div className="muted" style={{ marginTop: 4 }}>Trip: {b.trip.name}</div>
              <div className="muted">{fmt(b.trip.departureDate)}{b.trip.endDate ? ` – ${fmt(b.trip.endDate)}` : ""}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
            <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>Bill to</div>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{b.customerName}</div>
            <div className="muted">{[b.customerPhone, b.customer?.email].filter(Boolean).join(" · ")}</div>
            <div className="muted small" style={{ marginTop: 2 }}>{b.pax} traveller{b.pax === 1 ? "" : "s"}</div>
          </div>

          <table className="t" style={{ marginTop: 6 }}>
            <thead><tr><th style={{ paddingLeft: 0 }}>Description</th><th>SAC</th><th className="num">Amount (₹)</th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}><td style={{ paddingLeft: 0 }}>{l.label}</td><td className="muted small">{i === 0 ? (org?.sacCode || "998555") : ""}</td><td className="num">{formatINR(l.amount)}</td></tr>
              ))}
              <tr style={{ fontWeight: 600 }}><td style={{ paddingLeft: 0 }}>Taxable value</td><td></td><td className="num">{formatINR(taxable)}</td></tr>
              <tr><td style={{ paddingLeft: 0 }} className="muted">CGST @ {(b.gstRate ?? 5) / 2}%</td><td></td><td className="num muted">{formatINR(cgst)}</td></tr>
              <tr><td style={{ paddingLeft: 0 }} className="muted">SGST @ {(b.gstRate ?? 5) / 2}%</td><td></td><td className="num muted">{formatINR(sgst)}</td></tr>
              <tr><td style={{ paddingLeft: 0 }} className="muted">TCS @ {b.tcsRate ?? 2}%</td><td></td><td className="num muted">{formatINR(tcs)}</td></tr>
              {nonTax > 0 && <tr><td style={{ paddingLeft: 0 }} className="muted">Non-taxable charges</td><td></td><td className="num muted">{formatINR(nonTax)}</td></tr>}
              <tr style={{ fontWeight: 700, fontSize: 15 }}><td style={{ paddingLeft: 0 }}>Total</td><td></td><td className="num">{formatINR(total)}</td></tr>
            </tbody>
          </table>

          <div style={{ fontSize: 12.5, marginTop: 10 }}><b>Amount in words:</b> {amountInWords(total)}</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26, gap: 20 }}>
            <div className="muted" style={{ fontSize: 11.5, maxWidth: 380 }}>
              {org?.invoiceNote || "This is a computer-generated tax invoice."}
              <div style={{ marginTop: 4 }}>GST shown as CGST + SGST (intra-state). For inter-state supply this is charged as IGST — verify place of supply.</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 12.5 }}>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px solid var(--text-3)", paddingTop: 4, minWidth: 160 }}>For {org?.legalName || org?.name}</div>
              <div className="muted small">Authorised signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
