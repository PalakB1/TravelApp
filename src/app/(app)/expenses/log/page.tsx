import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";

import TableLabels from "@/components/TableLabels";
import TableSearch from "@/components/TableSearch";
import { orgMoney } from "@/lib/orgMoney";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// The full ledger, newest first — every rupee that left the business, whether
// it was tagged to a trip or not.
//
// The Costing page is a working screen: add a spend, reconcile a trip, settle
// what you owe people. This one is the record. Its particular job is money
// staff put in from their own pocket: that isn't just an expense, it's a debt
// the company owes them, and it stays visible as one until a transfer clears it.
export default async function ExpenseLogPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; person?: string }>;
}) {
  const $ = await orgMoney();
  const scope = await requireScope();
  const { view, person } = await searchParams;

  const where = scope.tripIds
    ? { orgId: scope.orgId, deletedAt: null, OR: [{ tripId: { in: scope.tripIds } }, { tripId: null }] }
    : { orgId: scope.orgId, deletedAt: null };

  const all = await prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: {
      trip: { select: { id: true, name: true } },
      settlement: { select: { id: true, date: true, reference: true, bankName: true } },
      items: {
        select: {
          amount: true,
          hotel: { select: { hotelName: true } },
          car: { select: { label: true } },
          vendor: { select: { vendorName: true } },
        },
      },
    },
  });

  // A personal spend is a loan to the company until a settlement repays it.
  const loans = all.filter((e) => e.paidPersonally);
  const outstanding = loans.filter((e) => !e.settlementId);
  const repaid = loans.filter((e) => e.settlementId);

  // Who is owed what, biggest first — the list you actually act on.
  const owedBy = new Map<string, number>();
  for (const e of outstanding) {
    const who = e.paidBy?.trim() || "Unattributed";
    owedBy.set(who, (owedBy.get(who) ?? 0) + e.amount);
  }
  const owedRows = [...owedBy.entries()].sort((a, b) => b[1] - a[1]);
  const owedTotal = outstanding.reduce((s, e) => s + e.amount, 0);

  const rows =
    view === "loans" ? outstanding
      : view === "repaid" ? repaid
        : view === "company" ? all.filter((e) => !e.paidPersonally)
          : all;
  const shown = person ? rows.filter((e) => (e.paidBy?.trim() || "Unattributed") === person) : rows;

  const totalSpend = all.reduce((s, e) => s + e.amount, 0);
  const unpaidBills = all.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount, 0);

  const tab = (key: string, label: string, count: number) => {
    const on = (view ?? "all") === key;
    const qs = key === "all" ? "/expenses/log" : `/expenses/log?view=${key}`;
    return (
      <Link key={key} href={qs} className={`btn sm ${on ? "primary" : ""}`}>
        {label} <span className="small" style={{ opacity: 0.75 }}>{count}</span>
      </Link>
    );
  };

  return (
    <div className="stack-tables">
      <TableLabels />
      <div className="page-head">
        <div>
          <h1>Expense log</h1>
          <p className="sub">Every spend, newest first · money staff fronted shows as a loan until it&apos;s paid back</p>
        </div>
        <Link className="btn" href="/expenses">← Costing</Link>
      </div>

      <div className="metrics">
        <div className="metric"><div className="label">Total logged</div><div className="value">{$.fmt(totalSpend)}</div><div className="foot">{all.length} entries</div></div>
        <div className={`metric ${owedTotal > 0 ? "c-amber" : "c-emerald"}`}>
          <div className="label">Owed to staff</div>
          <div className="value">{$.fmt(owedTotal)}</div>
          <div className="foot">{outstanding.length} unreimbursed {outstanding.length === 1 ? "spend" : "spends"}</div>
        </div>
        <div className={`metric ${unpaidBills > 0 ? "c-amber" : "c-emerald"}`}>
          <div className="label">Bills not yet paid</div>
          <div className="value">{$.fmt(unpaidBills)}</div>
          <div className="foot">supplier invoices sitting due</div>
        </div>
      </div>

      {/* Who the company owes. This is a liability, not a cost centre — it's
          money that has to go back out to a named person. */}
      {owedRows.length > 0 && (
        <div className="card">
          <div className="card-title">
            Loans outstanding <span className="small muted">staff money in the business, waiting to be returned</span>
          </div>
          <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
            {owedRows.map(([who, amt]) => (
              <Link
                key={who}
                href={`/expenses/log?view=loans&person=${encodeURIComponent(who)}`}
                className="btn sm"
                style={{ borderColor: person === who ? "var(--accent)" : undefined }}
              >
                {who} · <b>{$.fmt(amt)}</b>
              </Link>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
            Settle them from <Link href="/expenses">Costing</Link> — pick the spends, record one transfer, and they get
            stamped with its reference here.
          </p>
        </div>
      )}

      <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {tab("all", "Everything", all.length)}
        {tab("company", "Company money", all.length - loans.length)}
        {tab("loans", "Loans outstanding", outstanding.length)}
        {tab("repaid", "Loans repaid", repaid.length)}
        {person && <Link className="btn sm" href={`/expenses/log?view=${view ?? "all"}`}>✕ {person}</Link>}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {shown.length === 0 ? (
          <div className="empty">Nothing logged here yet.</div>
        ) : (
          <TableSearch placeholder="Search payee, trip or note…">
            <table className="t">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Date</th>
                  <th>Paid to</th>
                  <th>What for</th>
                  <th>Paid from</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const tagged = e.items
                    .map((i) => i.hotel?.hotelName || i.car?.label || i.vendor?.vendorName)
                    .filter(Boolean);
                  return (
                    <tr key={e.id}>
                      <td style={{ paddingLeft: 20 }} className="muted small">{fmt(e.date)}</td>
                      <td>
                        <b>{e.payee || "—"}</b>
                        <div className="small muted">{e.category}</div>
                      </td>
                      <td className="small">
                        {e.trip ? <Link className="row-link" href={`/trips/${e.trip.id}`}>{e.trip.name}</Link> : <span className="muted">General overhead</span>}
                        {tagged.length > 0 && (
                          <div className="muted" style={{ fontSize: 11.5 }}>
                            {tagged.length === 1 ? tagged[0] : `${tagged.length} items · ${tagged.slice(0, 2).join(", ")}${tagged.length > 2 ? "…" : ""}`}
                          </div>
                        )}
                        {e.notes && <div className="muted" style={{ fontSize: 11.5 }}>{e.notes}</div>}
                      </td>
                      <td className="small">
                        {e.paidPersonally ? (
                          <>
                            <span className="badge violet">loan</span>
                            <div className="muted" style={{ fontSize: 11.5 }}>{e.paidBy || "unattributed"}</div>
                          </>
                        ) : (
                          <>
                            <span className="muted">{e.bankName || "—"}</span>
                            {e.paymentMode && <div className="muted" style={{ fontSize: 11.5 }}>{e.paymentMode}</div>}
                          </>
                        )}
                      </td>
                      <td className="num" style={{ fontWeight: 500 }}>{$.fmt(e.amount)}</td>
                      <td>
                        {e.paidPersonally ? (
                          e.settlement ? (
                            <>
                              <span className="badge emerald">repaid</span>
                              <div className="muted" style={{ fontSize: 11.5 }}>
                                {fmt(e.settlement.date)}
                                {e.settlement.reference ? ` · ${e.settlement.reference}` : ""}
                              </div>
                            </>
                          ) : (
                            <span className="badge amber">to reimburse</span>
                          )
                        ) : e.status === "pending" ? (
                          <span className="badge amber">unpaid</span>
                        ) : (
                          <span className="badge emerald">paid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableSearch>
        )}
      </div>
    </div>
  );
}
