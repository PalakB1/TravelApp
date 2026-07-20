import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";
import ActivityLog from "@/components/ActivityLog";
import { addExpense, deleteExpense } from "./actions";

export const dynamic = "force-dynamic";

// Spend categories — value stored, label shown.
const CATS: { value: string; label: string }[] = [
  { value: "hotel", label: "Hotel / stay" },
  { value: "transport", label: "Transport / car" },
  { value: "flight", label: "Flight" },
  { value: "guide", label: "Guide / activity" },
  { value: "permit", label: "Permit / entry" },
  { value: "fuel", label: "Fuel / tolls" },
  { value: "visa", label: "Visa" },
  { value: "marketing", label: "Marketing / ads" },
  { value: "salary", label: "Salary / payroll" },
  { value: "office", label: "Office / rent" },
  { value: "software", label: "Software / tools" },
  { value: "tax", label: "Tax / govt" },
  { value: "misc", label: "Miscellaneous" },
];
const catLabel = (v: string) => CATS.find((c) => c.value === v)?.label ?? v;

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const scope = await requireScope();
  const sp = await searchParams;

  const trips = await prisma.trip.findMany({
    where: scope.tripWhere,
    orderBy: [{ departureDate: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true },
  });
  const tripIdSet = new Set(trips.map((t) => t.id));

  // Base scope: org, and — for trip-limited members — only their trips' rows.
  const base: Record<string, unknown> = scope.tripIds
    ? { orgId: scope.orgId, tripId: { in: scope.tripIds } }
    : { orgId: scope.orgId };

  // Optional filter chip: ?trip=general (untagged) or ?trip=<id>.
  const filter = sp.trip;
  const where: Record<string, unknown> = { ...base };
  if (filter === "general") where.tripId = null;
  else if (filter && tripIdSet.has(filter)) where.tripId = filter;

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    include: { trip: { select: { id: true, name: true } } },
  });

  // Totals across the CURRENT filter.
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const tripLinked = expenses.filter((e) => e.tripId).reduce((s, e) => s + e.amount, 0);
  const general = total - tripLinked;
  const pending = expenses.filter((e) => e.status === "pending");
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0);

  const filterLabel = filter === "general" ? "General overheads" : filter && tripIdSet.has(filter) ? trips.find((t) => t.id === filter)?.name : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Costing</h1>
          <p className="sub">
            {formatINR(total)} spent across {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
            {filterLabel ? ` · ${filterLabel}` : ""}
            {pending.length > 0 ? ` · ${formatINR(pendingTotal)} unpaid` : ""}
          </p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric c-amber"><div className="label">Total spend</div><div className="value">{formatINR(total)}</div><div className="foot">{expenses.length} {expenses.length === 1 ? "entry" : "entries"}</div></div>
        <div className="metric c-violet"><div className="label">Trip-linked</div><div className="value">{formatINR(tripLinked)}</div><div className="foot">tagged to a trip</div></div>
        <div className="metric c-sky"><div className="label">General / overhead</div><div className="value">{formatINR(general)}</div><div className="foot">no trip</div></div>
        <div className={`metric ${pendingTotal > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Unpaid</div><div className="value">{formatINR(pendingTotal)}</div><div className="foot">{pending.length} pending</div></div>
      </div>

      <div className="card">
        <div className="card-title">Add a spend <span className="small muted">tag it to a trip or leave it general · attach the invoice if you have it</span></div>
        <form action={addExpense}>
          <div className="row-3">
            <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="12000 or 12k" required /></label>
            <label className="field"><span className="lbl">Paid to (vendor)</span><input name="payee" placeholder="Hotel Kviknes / Blue Car Rental…" /></label>
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Assign to trip</span>
              <select name="tripId" defaultValue={filter && tripIdSet.has(filter) ? filter : ""}>
                <option value="">General / no trip</option>
                {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Category</span>
              <select name="category" defaultValue="misc">
                {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Payment mode</span>
              <select name="paymentMode" defaultValue="bank">
                <option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option>
              </select>
            </label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Status</span>
              <select name="status" defaultValue="paid"><option value="paid">Paid</option><option value="pending">Unpaid / due</option></select>
            </label>
            <label className="field"><span className="lbl">Notes</span><input name="notes" placeholder="3 nights · advance / balance…" /></label>
            <label className="field"><span className="lbl">Invoice / receipt <span className="small muted">optional</span></span><input name="file" type="file" accept="image/*,application/pdf" /></label>
          </div>
          <button className="primary" type="submit">Add spend</button>
        </form>
      </div>

      <div className="card">
        <div className="between" style={{ marginBottom: 10 }}>
          <div className="card-title" style={{ margin: 0 }}>Ledger</div>
          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
            <Link href="/expenses" className={`btn sm ${!filter ? "primary" : ""}`}>All</Link>
            <Link href="/expenses?trip=general" className={`btn sm ${filter === "general" ? "primary" : ""}`}>General</Link>
            {trips.length > 0 && (
              <form method="get" action="/expenses" className="flex" style={{ gap: 6 }}>
                <select name="trip" defaultValue={filter && tripIdSet.has(filter) ? filter : ""} style={{ fontSize: 13 }}>
                  <option value="">By trip…</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="btn sm" type="submit">Filter</button>
              </form>
            )}
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="empty">No spend logged{filterLabel ? ` for ${filterLabel}` : " yet"}. Add your first above — supplier bills, ground costs, fuel, salaries, ads, anything.</div>
        ) : (
          <TableSearch placeholder="Search vendor, trip, category or note…" tags={["paid", "pending"]}>
            <table className="t">
              <thead><tr><th>Date</th><th>Paid to</th><th>Category</th><th>Trip</th><th>Notes</th><th className="num">Amount</th><th></th><th></th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="muted small">{fmtDate(e.date)}</td>
                    <td>{e.payee || <span className="muted">—</span>}{e.status === "pending" && <span className="badge amber" style={{ marginLeft: 6 }}>unpaid</span>}</td>
                    <td><span className="badge gray">{catLabel(e.category)}</span></td>
                    <td className="muted">{e.trip ? <Link className="row-link" href={`/trips/${e.trip.id}`}>{e.trip.name}</Link> : <span className="small" style={{ color: "var(--text-3)" }}>General</span>}</td>
                    <td className="muted small">{e.notes || ""}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(e.amount)}</td>
                    <td className="num">{e.fileData ? <a className="btn sm" href={`/expenses/file/${e.id}`} target="_blank" rel="noopener" title={e.fileName || "invoice"}>📎 View</a> : null}</td>
                    <td className="num"><form action={deleteExpense}><input type="hidden" name="id" value={e.id} /><button className="sm" type="submit" aria-label="Delete">✕</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableSearch>
        )}
      </div>

      <ActivityLog category="expense" title="Costing activity — added &amp; removed" />
    </>
  );
}
