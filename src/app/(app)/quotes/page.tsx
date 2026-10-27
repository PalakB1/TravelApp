import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { orgMoney } from "@/lib/orgMoney";
import { quoteTotals, quoteState } from "@/lib/quote";
import { createQuotation } from "./actions";
import TableSearch from "@/components/TableSearch";
import SubmitButton from "@/components/SubmitButton";
import Combobox from "@/components/Combobox";

export const dynamic = "force-dynamic";

const fmtDay = (d: Date | null) =>
  d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

export default async function QuotesPage() {
  const scope = await requireScope();
  const $ = await orgMoney();

  const [quotes, trips] = await Promise.all([
    prisma.quotation.findMany({
      where: { orgId: scope.orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { items: true, trip: { select: { name: true } } },
    }),
    prisma.trip.findMany({
      where: { ...scope.tripWhere },
      orderBy: [{ departureDate: "desc" }],
      take: 60,
      select: { id: true, name: true, destination: true, isCustom: true },
    }),
  ]);

  const now = new Date();
  const live = quotes.filter((q) => quoteState(q, now).label === "sent").length;
  const won = quotes.filter((q) => q.status === "accepted");
  const wonValue = won.reduce((s, q) => s + quoteTotals(q.items, q.taxRate, q.pax).total, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Quotations</h1>
          <p className="sub">
            {quotes.length} quotation{quotes.length === 1 ? "" : "s"}
            {live > 0 ? ` · ${live} out with clients` : ""}
            {won.length > 0 ? ` · ${won.length} accepted, ${$.short(wonValue)}` : ""}
          </p>
        </div>
      </div>

      <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
        <div className="card-title">
          New quotation
          <span className="small muted">what you send before anything is booked</span>
        </div>
        <form action={createQuotation}>
          <div className="row-3">
            <label className="field"><span className="lbl">Client name</span><input name="clientName" placeholder="Who you're quoting" required /></label>
            <label className="field"><span className="lbl">Phone</span><input name="clientPhone" placeholder="+91 …" /></label>
            <label className="field"><span className="lbl">Travellers</span><input name="pax" type="number" min="0" placeholder="6" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">For which trip <span className="small muted">optional</span></span>
              <Combobox
                name="tripId"
                placeholder="Type a trip name…"
                emptyHint="No match — a quotation doesn't need a trip."
                options={trips.map((t) => ({
                  id: t.id,
                  label: t.name,
                  sub: `${t.destination || "—"}${t.isCustom ? " · custom" : ""}`,
                }))}
              />
            </label>
            <label className="field"><span className="lbl">Valid until</span><input name="validUntil" type="date" /></label>
            <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
              <SubmitButton className="primary" pendingLabel="Creating…">Create &amp; add prices</SubmitButton>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Pick a trip and the quotation is titled after it — but a quotation stands on its own, so you can write
            one for something that isn&apos;t in TripZei yet.
          </p>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {quotes.length === 0 ? (
          <div className="empty">No quotations yet. Write one above and you&apos;ll get a link and a PDF to send.</div>
        ) : (
          <TableSearch placeholder="Search client, trip or number…" tags={["draft", "sent", "accepted", "declined"]}>
            <table className="t">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Client</th><th>For</th><th>Number</th>
                  <th>Valid until</th><th className="num">Total</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const t = quoteTotals(q.items, q.taxRate, q.pax);
                  const st = quoteState(q, now);
                  return (
                    <tr key={q.id}>
                      <td style={{ paddingLeft: 20 }}>
                        <Link className="row-link" href={`/quotes/${q.id}`}>{q.clientName}</Link>
                        {q.pax > 0 ? <span className="small muted"> · {q.pax} pax</span> : null}
                      </td>
                      <td className="muted small">{q.trip?.name ?? q.title}</td>
                      <td className="muted small">{q.quoteNo ?? "—"}</td>
                      <td className="muted small">{fmtDay(q.validUntil)}</td>
                      <td className="num" style={{ fontWeight: 500 }}>{$.fmt(t.total)}</td>
                      <td><span className={`badge ${st.tone}`}>{st.label}</span></td>
                      <td className="num"><Link className="btn sm" href={`/quotes/${q.id}`}>Open →</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableSearch>
        )}
      </div>
    </>
  );
}
