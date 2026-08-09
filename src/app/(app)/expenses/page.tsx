import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { getOrgContext } from "@/lib/org";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";
import ActivityLog from "@/components/ActivityLog";
import SettlePersonal, { type PersonalRow } from "@/components/SettlePersonal";
import { addExpense, deleteExpense, undoSettlement } from "./actions";
import ExpenseTargets from "@/components/ExpenseTargets";
import SubmitButton from "@/components/SubmitButton";
import DeleteExpense from "@/components/DeleteExpense";

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
    select: {
      id: true,
      name: true,
      itinerary: { orderBy: { order: "asc" }, select: { date: true, location: true, hotels: { select: { id: true, hotelName: true } } } },
      cars: { select: { id: true, label: true, carType: true } },
      vendorBookings: { select: { id: true, vendorName: true, detail: true } },
    },
  });
  const tripIdSet = new Set(trips.map((t) => t.id));

  // Flattened for the picker: every taggable thing in a trip, grouped by kind.
  // Nights carry their date so three stays at the same hotel are distinguishable.
  const targetTrips = trips.map((t) => ({
    id: t.id,
    name: t.name,
    items: [
      ...t.itinerary.flatMap((n) =>
        n.hotels.map((h) => ({
          ref: `hotel:${h.id}`,
          label: `${h.hotelName}${n.location ? ` · ${n.location}` : ""}${n.date ? ` · ${n.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`,
          group: "Hotels",
        })),
      ),
      ...t.cars.map((c) => ({ ref: `car:${c.id}`, label: `${c.label}${c.carType ? ` · ${c.carType}` : ""}`, group: "Cars" })),
      ...t.vendorBookings.map((v) => ({ ref: `vendor:${v.id}`, label: `${v.vendorName}${v.detail ? ` · ${v.detail}` : ""}`, group: "Extras & suppliers" })),
    ],
  }));

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
    include: { trip: { select: { id: true, name: true } }, hotel: { select: { hotelName: true } }, car: { select: { label: true, carType: true } } },
  });

  // Personal spends still owed back (ignores the trip filter — always show the
  // full reimbursement backlog). Grouped by who paid.
  const personalOwed = await prisma.expense.findMany({
    where: { ...base, paidPersonally: true, settlementId: null, deletedAt: null },
    orderBy: { date: "asc" },
    include: { trip: { select: { name: true } }, hotel: { select: { hotelName: true } }, car: { select: { label: true } } },
  });
  const owedTotal = personalOwed.reduce((s, e) => s + e.amount, 0);

  const assignedLabel = (e: (typeof personalOwed)[number]) =>
    e.hotel ? `${e.trip?.name ?? "trip"} › ${e.hotel.hotelName}` : e.car ? `${e.trip?.name ?? "trip"} › ${e.car.label}` : e.trip?.name ?? "General";

  const groupsMap = new Map<string, PersonalRow[]>();
  for (const e of personalOwed) {
    const person = e.paidBy?.trim() || "Unattributed";
    const row: PersonalRow = { id: e.id, date: fmtDate(e.date), payee: e.payee || "", category: catLabel(e.category), trip: assignedLabel(e), bankName: e.bankName || "", notes: e.notes || "", amount: e.amount };
    (groupsMap.get(person) ?? groupsMap.set(person, []).get(person)!).push(row);
  }
  const personalGroups = [...groupsMap.entries()].map(([person, rows]) => ({ person, rows }));

  // Past reimbursements (settlement history).
  const settlements = await prisma.settlement.findMany({
    where: { orgId: scope.orgId },
    orderBy: { date: "desc" },
    include: { expenses: { select: { id: true, payee: true, amount: true, category: true } } },
  });

  // Bank names seen so far → autocomplete source for the spend + settle forms.
  const bankSet = new Set<string>();
  for (const e of expenses) if (e.bankName) bankSet.add(e.bankName);
  for (const e of personalOwed) if (e.bankName) bankSet.add(e.bankName);
  for (const s of settlements) if (s.bankName) bankSet.add(s.bankName);
  const banks = [...bankSet].sort((a, b) => a.localeCompare(b));

  // Prefill "Paid by" with the signed-in member's name.
  const ctx = await getOrgContext();
  const myName = ctx?.session.name ?? "";

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
        <Link className="btn" href="/expenses/log">📋 Expense log</Link>
      </div>

      <div className="metrics">
        <div className="metric c-amber"><div className="label">Total spend</div><div className="value">{formatINR(total)}</div><div className="foot">{expenses.length} {expenses.length === 1 ? "entry" : "entries"}</div></div>
        <div className="metric c-violet"><div className="label">Trip-linked</div><div className="value">{formatINR(tripLinked)}</div><div className="foot">tagged to a trip</div></div>
        <div className="metric c-sky"><div className="label">General / overhead</div><div className="value">{formatINR(general)}</div><div className="foot">no trip</div></div>
        <div className={`metric ${pendingTotal > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Unpaid</div><div className="value">{formatINR(pendingTotal)}</div><div className="foot">{pending.length} pending</div></div>
        <div className={`metric ${owedTotal > 0 ? "c-amber" : "c-emerald"}`}><div className="label">Owed to staff</div><div className="value">{formatINR(owedTotal)}</div><div className="foot">{personalOwed.length} personal spend{personalOwed.length === 1 ? "" : "s"} to reimburse</div></div>
      </div>

      {/* 12 fields is a lot to face every visit — tucked behind a toggle like the
          rest of the app's add-forms, but opened by default when there's nothing
          logged yet (so a new user still lands on the thing to do). */}
      <details className="card" open={expenses.length === 0}>
        <summary style={{ cursor: "pointer", listStyle: "none" }}>
          <span className="card-title" style={{ margin: 0 }}>+ Add a spend <span className="small muted">tag it to a trip or leave it general · attach the invoice if you have it</span></span>
        </summary>
        <div style={{ marginTop: 14 }}>
        <form action={addExpense}>
          <div className="row-3">
            <ExpenseTargets trips={targetTrips} defaultTripId={filter && tripIdSet.has(filter) ? filter : ""} />
            <label className="field"><span className="lbl">Expense type</span>
              <select name="category" defaultValue="misc">
                {CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="12000 or 12k" required /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Paid to (vendor)</span><input name="payee" placeholder="Hotel Kviknes / Blue Car Rental…" /></label>
            <label className="field"><span className="lbl">Payment mode</span>
              <select name="paymentMode" defaultValue="bank">
                <option value="bank">Bank transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option>
              </select>
            </label>
            <label className="field"><span className="lbl">Bank / account <span className="small muted">optional</span></span>
              <input name="bankName" list="bank-names" placeholder="HDFC current / ICICI…" />
            </label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
            <label className="field"><span className="lbl">Status</span>
              <select name="status" defaultValue="paid"><option value="paid">Paid</option><option value="pending">Unpaid / due</option></select>
            </label>
            <label className="field"><span className="lbl">Notes</span><input name="notes" placeholder="3 nights · advance / balance…" /></label>
          </div>
          <div className="row-3" style={{ alignItems: "end" }}>
            <label className="field" style={{ justifyContent: "center" }}>
              <span className="flex" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" name="paidPersonally" style={{ width: "auto" }} />
                <span className="lbl" style={{ margin: 0 }}>Paid from personal money <span className="small muted">— to be reimbursed</span></span>
              </span>
            </label>
            <label className="field"><span className="lbl">Paid by <span className="small muted">if personal</span></span><input name="paidBy" defaultValue={myName} placeholder="Who fronted the money" /></label>
            <label className="field"><span className="lbl">Invoice / receipt <span className="small muted">optional</span></span><input name="file" type="file" accept="image/*,application/pdf" /></label>
          </div>
          <SubmitButton className="primary" pendingLabel="Saving…">Add spend</SubmitButton>
        </form>
        </div>
      </details>

      {/* One datalist, referenced by both the spend form and the settle forms. */}
      <datalist id="bank-names">{banks.map((b) => <option key={b} value={b} />)}</datalist>

      {/* PERSONAL SPENDS TO REIMBURSE — pick any/all, settle in one transfer. */}
      {personalOwed.length > 0 && (
        <div className="card">
          <div className="card-title">Reimburse personal spends <span className="small muted">{formatINR(owedTotal)} owed · tick the ones you&apos;re settling and record the transfer</span></div>
          <SettlePersonal groups={personalGroups} />
        </div>
      )}

      {/* REIMBURSEMENT HISTORY */}
      {settlements.length > 0 && (
        <details className="section">
          <summary className="between" style={{ padding: "14px 18px", cursor: "pointer" }}>
            <span className="sec-title">Reimbursements paid</span>
            <span className="small muted">{settlements.length} transfer{settlements.length === 1 ? "" : "s"} · {formatINR(settlements.reduce((s, x) => s + x.amount, 0))}</span>
          </summary>
          <div style={{ padding: "0 18px 16px" }}>
            <table className="t">
              <thead><tr><th>Date</th><th>Reimbursed to</th><th>Bank</th><th>Txn no.</th><th>Covers</th><th className="num">Amount</th><th></th></tr></thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="muted small">{fmtDate(s.date)}</td>
                    <td>{s.paidTo || <span className="muted">—</span>}</td>
                    <td className="muted small">{s.bankName || "—"}</td>
                    <td className="muted small">{s.reference || "—"}</td>
                    <td className="muted small">{s.expenses.length} spend{s.expenses.length === 1 ? "" : "s"}{s.notes ? ` · ${s.notes}` : ""}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(s.amount)}</td>
                    <td className="num"><form action={undoSettlement}><input type="hidden" name="id" value={s.id} /><button className="sm" type="submit" title="Reverse this reimbursement — the spends become owed again">Undo</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

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
              <thead><tr><th>Date</th><th>Paid to</th><th>Category</th><th>Assigned to</th><th>Notes</th><th className="num">Amount</th><th></th><th></th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="muted small">{fmtDate(e.date)}</td>
                    <td>{e.payee || <span className="muted">—</span>}
                      {e.status === "pending" && <span className="badge amber" style={{ marginLeft: 6 }}>unpaid</span>}
                      {e.paidPersonally && (e.settlementId
                        ? <span className="badge gray" style={{ marginLeft: 6 }} title={e.paidBy ? `Paid by ${e.paidBy}, reimbursed` : "Reimbursed"}>reimbursed</span>
                        : <span className="badge amber" style={{ marginLeft: 6 }} title={e.paidBy ? `Paid personally by ${e.paidBy}` : "Paid personally"}>personal{e.paidBy ? ` · ${e.paidBy}` : ""}</span>)}
                    </td>
                    <td><span className="badge gray">{catLabel(e.category)}</span></td>
                    <td className="muted">
                      {e.trip ? (
                        <Link className="row-link" href={`/trips/${e.trip.id}`}>{e.trip.name}</Link>
                      ) : <span className="small" style={{ color: "var(--text-3)" }}>General</span>}
                      {e.hotel ? <span className="small muted"> › 🏨 {e.hotel.hotelName}</span> : e.car ? <span className="small muted"> › 🚗 {e.car.label}{e.car.carType ? ` (${e.car.carType})` : ""}</span> : null}
                    </td>
                    <td className="muted small">{e.notes || ""}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(e.amount)}</td>
                    <td className="num">{e.fileData ? <a className="btn sm" href={`/expenses/file/${e.id}`} target="_blank" rel="noopener" title={e.fileName || "invoice"}>📎 View</a> : null}</td>
                    <td className="num">
                      <DeleteExpense
                        action={deleteExpense}
                        id={e.id}
                        payee={e.payee || "this supplier"}
                        amountLabel={formatINR(e.amount)}
                        tripName={e.trip?.name}
                        personalFor={e.paidPersonally ? e.paidBy : null}
                        settled={!!e.settlementId}
                      />
                    </td>
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
