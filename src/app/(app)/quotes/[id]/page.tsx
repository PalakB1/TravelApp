import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { orgMoney } from "@/lib/orgMoney";
import { quoteTotals, quoteState, lineTotal } from "@/lib/quote";
import { updateQuotation, addQuoteItem, deleteQuoteItem, sendQuotation, setQuoteStatus, deleteQuotation } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import CopyLink from "@/components/CopyLink";

export const dynamic = "force-dynamic";

const dayInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function QuoteEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await requireScope();
  const $ = await orgMoney();

  const q = await prisma.quotation.findFirst({
    where: { id, orgId: scope.orgId, deletedAt: null },
    include: { items: { orderBy: { order: "asc" } }, trip: { select: { id: true, name: true } } },
  });
  if (!q) notFound();

  const t = quoteTotals(q.items, q.taxRate, q.pax);
  const st = quoteState(q);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "tripzei.com"}`;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/quotes" style={{ color: "var(--text-2)" }}>← Quotations</Link></div>
          <h1 style={{ marginTop: 6 }}>
            {q.clientName} <span className={`badge ${st.tone}`} style={{ verticalAlign: "middle" }}>{st.label}</span>
          </h1>
          <p className="sub">
            {q.quoteNo ? `${q.quoteNo} · ` : ""}{q.title}
            {q.trip ? <> · <Link href={`/trips/${q.trip.id}`} style={{ color: "var(--text-2)" }}>{q.trip.name}</Link></> : null}
          </p>
        </div>
        <div className="flex" style={{ gap: 8, alignItems: "flex-start" }}>
          <a className="btn sm" href={`/quote/${q.id}`} target="_blank" rel="noopener">Preview</a>
          <a className="btn sm" href={`/quote/${q.id}/pdf`}>↓ PDF</a>
          <details className="menu-pop" style={{ position: "relative" }}>
            <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer", color: "var(--danger)", borderColor: "var(--danger-bg)" }}>Delete</summary>
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 260, zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 14 }}>
              <p className="small muted" style={{ margin: "0 0 10px" }}>Delete this quotation?</p>
              <form action={deleteQuotation}><input type="hidden" name="id" value={q.id} /><button className="danger sm" type="submit">Yes, delete</button></form>
            </div>
          </details>
        </div>
      </div>

      {/* SEND / SHARE */}
      <div className="card" style={{ borderColor: q.status === "draft" ? "var(--accent)" : undefined }}>
        <div className="card-title">
          {q.status === "draft" ? "Ready to send?" : "Share this quotation"}
          <span className="small muted">
            {q.status === "draft"
              ? "it gets its number when you send it, so abandoned drafts don't use one up"
              : q.quoteNo ?? ""}
          </span>
        </div>
        {q.status === "draft" ? (
          <form action={sendQuotation} className="flex" style={{ gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input type="hidden" name="id" value={q.id} />
            <SubmitButton className="primary" pendingLabel="Preparing…">Mark as sent &amp; get the link</SubmitButton>
            <span className="small muted">You can keep editing afterwards — the link always shows the latest.</span>
          </form>
        ) : (
          <>
            <CopyLink
              path={`/quote/${q.id}`}
              label="Copy link"
              waText={`Here is your quotation${q.quoteNo ? ` (${q.quoteNo})` : ""}:`}
              defaultCc={$.dial}
            />
            <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {(["accepted", "declined", "sent"] as const).map((s) => (
                <form action={setQuoteStatus} key={s}>
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="status" value={s} />
                  <button className="sm" type="submit" disabled={q.status === s}>
                    {s === "accepted" ? "✓ Client accepted" : s === "declined" ? "✕ Client declined" : "↩ Back to sent"}
                  </button>
                </form>
              ))}
            </div>
            <p className="small muted" style={{ margin: "10px 0 0" }}>{origin}/quote/{q.id}</p>
          </>
        )}
      </div>

      {/* LINES */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "16px 20px 0" }}>
          What you&apos;re quoting
          <span className="small muted">{q.items.length} line{q.items.length === 1 ? "" : "s"} · a discount is a line with a minus in front of the price</span>
        </div>
        {q.items.length === 0 ? (
          <div className="empty">Nothing priced yet. Add the first line below.</div>
        ) : (
          <table className="t">
            <thead><tr><th style={{ paddingLeft: 20 }}>Item</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Amount</th><th></th></tr></thead>
            <tbody>
              {q.items.map((it) => (
                <tr key={it.id}>
                  <td style={{ paddingLeft: 20 }}>
                    {it.label}
                    {!it.taxable ? <span className="badge gray" style={{ marginLeft: 6 }}>no {q.taxLabel}</span> : null}
                    {it.detail ? <div className="small muted">{it.detail}</div> : null}
                  </td>
                  <td className="num muted">{it.qty}</td>
                  <td className="num muted">{$.fmt(it.unitPrice)}</td>
                  <td className="num" style={{ fontWeight: 500 }}>{$.fmt(lineTotal(it))}</td>
                  <td className="num">
                    <form action={deleteQuoteItem}><input type="hidden" name="id" value={it.id} /><button className="sm" type="submit" aria-label="Remove line">✕</button></form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ padding: "14px 20px 18px", borderTop: "1px solid var(--border)" }}>
          <form action={addQuoteItem}>
            <input type="hidden" name="quotationId" value={q.id} />
            <div className="row-3">
              <label className="field"><span className="lbl">Item</span><input name="label" placeholder="Land package — twin sharing" required /></label>
              <label className="field"><span className="lbl">Qty</span><input name="qty" type="number" min="0" defaultValue={q.pax || 1} /></label>
              <label className="field"><span className="lbl">Rate each</span><input name="unitPrice" placeholder="50000 or 50k" /></label>
            </div>
            <div className="row-3">
              <label className="field"><span className="lbl">Small print <span className="small muted">optional</span></span><input name="detail" placeholder="6 nights, breakfast, airport transfers" /></label>
              <label className="field"><span className="lbl">Tax</span>
                <select name="taxable" defaultValue="yes">
                  <option value="yes">{q.taxLabel} applies</option>
                  <option value="no">No {q.taxLabel} — passed through at cost</option>
                </select>
              </label>
              <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
                <SubmitButton className="primary" pendingLabel="Adding…">Add line</SubmitButton>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* TOTALS */}
      <div className="card">
        <div className="card-title">Totals</div>
        <table className="t">
          <tbody>
            <tr><td style={{ paddingLeft: 0 }}>Taxable</td><td className="num">{$.fmt(t.taxableBase)}</td></tr>
            <tr><td style={{ paddingLeft: 0 }}>{q.taxLabel} @ {q.taxRate}%</td><td className="num">{$.fmt(t.tax)}</td></tr>
            {t.nonTaxable !== 0 ? <tr><td style={{ paddingLeft: 0 }}>At cost — no {q.taxLabel}</td><td className="num">{$.fmt(t.nonTaxable)}</td></tr> : null}
            <tr><td style={{ paddingLeft: 0, fontWeight: 600 }}>Total</td><td className="num" style={{ fontWeight: 600 }}>{$.fmt(t.total)}</td></tr>
            {t.perPerson != null ? <tr><td style={{ paddingLeft: 0 }}>Per person <span className="small muted">{q.pax} travellers</span></td><td className="num">{$.fmt(t.perPerson)}</td></tr> : null}
          </tbody>
        </table>
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          {q.taxLabel} is shown on top of the price rather than buried in it, which is what a client expects to be
          able to read off a quote. The rate was fixed at {q.taxRate}% when this quotation was created, so it stays
          right even if your settings change later.
        </p>
      </div>

      {/* DETAILS */}
      <div className="card">
        <div className="card-title">Details &amp; terms</div>
        <form action={updateQuotation}>
          <input type="hidden" name="id" value={q.id} />
          <div className="row-3">
            <label className="field"><span className="lbl">Title</span><input name="title" defaultValue={q.title} /></label>
            <label className="field"><span className="lbl">Client name</span><input name="clientName" defaultValue={q.clientName} required /></label>
            <label className="field"><span className="lbl">Travellers</span><input name="pax" type="number" min="0" defaultValue={q.pax || ""} /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Phone</span><input name="clientPhone" defaultValue={q.clientPhone ?? ""} /></label>
            <label className="field"><span className="lbl">Email</span><input name="clientEmail" type="email" defaultValue={q.clientEmail ?? ""} /></label>
            <label className="field"><span className="lbl">Valid until</span><input name="validUntil" type="date" defaultValue={dayInput(q.validUntil)} /></label>
          </div>
          <label className="field">
            <span className="lbl">What&apos;s included, and anything they should read</span>
            <input name="notes" defaultValue={q.notes ?? ""} placeholder="Inclusions, exclusions, payment terms, cancellation" />
          </label>
          <SubmitButton className="primary sm" pendingLabel="Saving…">Save details</SubmitButton>
        </form>
      </div>
    </>
  );
}
