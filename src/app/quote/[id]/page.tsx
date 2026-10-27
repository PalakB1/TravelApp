import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { quoteTotals, quoteExpired, lineTotal } from "@/lib/quote";
import { buildMoney } from "@/lib/orgMoney";
import PrintButton from "@/components/PrintButton";
import PoweredBy from "@/components/PoweredBy";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

function Cell({ children, num, head, bold }: { children?: React.ReactNode; num?: boolean; head?: boolean; bold?: boolean }) {
  return (
    <td style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", textAlign: num ? "right" : "left", fontWeight: head || bold ? 600 : 400, fontSize: head ? 11 : 13, color: head ? "var(--text-2)" : "var(--text)", textTransform: head ? "uppercase" : "none" }}>{children}</td>
  );
}

// What the client opens. PUBLIC — the link is the permission, same as the
// invoice and receipt pages.
//
// A draft is deliberately not viewable: a quotation that has not been sent is
// still being argued about internally, and a link pasted a minute too early
// should show nothing rather than half a price list.
export default async function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quotation.findFirst({
    where: { id, deletedAt: null },
    include: { items: { orderBy: { order: "asc" } }, org: true, trip: { select: { name: true, destination: true, nights: true, days: true } } },
  });
  if (!q) notFound();

  const $ = buildMoney(q.org);
  const agency = q.org?.legalName || q.org?.name || "TripZei";
  const t = quoteTotals(q.items, q.taxRate, q.pax);
  const expired = quoteExpired(q.validUntil);

  if (q.status === "draft") {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>📝</div>
          <h2 style={{ fontSize: 17 }}>This quotation isn&apos;t ready yet</h2>
          <p className="muted small">{agency} is still putting it together. They&apos;ll send it over shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: 780, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="brand" style={{ paddingLeft: 0 }}><Logo /></div>
          <div className="flex" style={{ gap: 8 }}>
            <a className="btn sm" href={`/quote/${q.id}/pdf`}>↓ Download PDF</a>
            <PrintButton />
          </div>
        </div>

        {expired && (
          <div className="card no-print" style={{ borderColor: "var(--warning)", marginBottom: 14 }}>
            <b>This quotation has passed its validity date.</b>
            <p className="small muted" style={{ margin: "6px 0 0" }}>
              Prices move — hotels, flights and exchange rates all change. Ask {agency} to confirm before you book.
            </p>
          </div>
        )}

        <div className="card sheet">
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            {q.org?.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={q.org.logo} alt="" style={{ height: 48, maxWidth: 170, objectFit: "contain", marginBottom: 8 }} />
            ) : null}
            <div style={{ fontSize: 17, fontWeight: 700 }}>{agency}</div>
            {q.org?.gstAddress && <div className="small muted">{q.org.gstAddress}</div>}
            {q.org?.gstin && <div className="small muted">{$.taxIdLabel}: {q.org.gstin}</div>}
            <div style={{ marginTop: 10, fontWeight: 700, letterSpacing: "0.08em", fontSize: 13 }}>QUOTATION</div>
          </div>

          <div className="between" style={{ flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <div>
              <div className="small muted">Prepared for</div>
              <div style={{ fontWeight: 600 }}>{q.clientName}</div>
              {q.clientPhone && <div className="small muted">{q.clientPhone}</div>}
              {q.clientEmail && <div className="small muted">{q.clientEmail}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              {q.quoteNo && <div className="small"><span className="muted">Quotation no. </span>{q.quoteNo}</div>}
              <div className="small"><span className="muted">Date </span>{fmt(q.createdAt)}</div>
              {q.validUntil && <div className="small"><span className="muted">Valid until </span>{fmt(q.validUntil)}</div>}
              {q.pax > 0 && <div className="small"><span className="muted">Travellers </span>{q.pax}</div>}
            </div>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 10 }}>
            {q.title}
            {q.trip?.destination ? <span className="muted" style={{ fontWeight: 400 }}> · {q.trip.destination}</span> : null}
            {q.trip && q.trip.nights > 0 ? <span className="muted" style={{ fontWeight: 400 }}> · {q.trip.nights} nights</span> : null}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Cell head>Item</Cell>
                <Cell head num>Qty</Cell>
                <Cell head num>Rate</Cell>
                <Cell head num>Amount</Cell>
              </tr>
            </thead>
            <tbody>
              {q.items.map((it) => (
                <tr key={it.id}>
                  <Cell>
                    {it.label}
                    {it.detail ? <div className="small muted">{it.detail}</div> : null}
                  </Cell>
                  <Cell num>{it.qty}</Cell>
                  <Cell num>{$.fmt(it.unitPrice)}</Cell>
                  <Cell num bold>{$.fmt(lineTotal(it))}</Cell>
                </tr>
              ))}
              <tr>
                <Cell /><Cell /><Cell num>Subtotal</Cell><Cell num>{$.fmt(t.taxableBase)}</Cell>
              </tr>
              <tr>
                <Cell /><Cell /><Cell num>{q.taxLabel} @ {q.taxRate}%</Cell><Cell num>{$.fmt(t.tax)}</Cell>
              </tr>
              {t.nonTaxable !== 0 && (
                <tr>
                  <Cell /><Cell /><Cell num>At cost (no {q.taxLabel})</Cell><Cell num>{$.fmt(t.nonTaxable)}</Cell>
                </tr>
              )}
              <tr>
                <Cell /><Cell /><Cell num bold>Total</Cell><Cell num bold>{$.fmt(t.total)}</Cell>
              </tr>
              {t.perPerson != null && (
                <tr>
                  <Cell /><Cell /><Cell num>Per person</Cell><Cell num>{$.fmt(t.perPerson)}</Cell>
                </tr>
              )}
            </tbody>
          </table>

          {q.notes && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Please note</div>
              <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{q.notes}</p>
            </div>
          )}

          <p className="small muted" style={{ marginTop: 18 }}>
            This is a quotation, not an invoice — nothing is held or charged until you confirm.
            {q.validUntil ? ` Prices are held until ${fmt(q.validUntil)}.` : ""}
          </p>
          {!q.org?.hideBranding && <PoweredBy />}
        </div>
      </div>
    </div>
  );
}
