import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { bookingPaid, bookingBalance, bookingTotal, isActive } from "@/lib/calc";
import { formatINR, formatINRShort } from "@/lib/money";
import TableSearch from "@/components/TableSearch";
import Combobox from "@/components/Combobox";
import ActivityLog from "@/components/ActivityLog";
import CopyLink from "@/components/CopyLink";
import ShareReceipt from "@/components/ShareReceipt";
import RemindPayment from "@/components/RemindPayment";
import RemindCancelWindow from "@/components/RemindCancelWindow";
import { scheduleStatus } from "@/lib/schedule";
import { addPayment, approvePendingPayment, rejectPendingPayment } from "../data-actions";
import SubmitButton from "@/components/SubmitButton";
import { visaMeta } from "@/lib/visaStatus";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const VIEWS = ["due", "record", "history", "approve"] as const;
type View = (typeof VIEWS)[number];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ due?: string; view?: string }> }) {
  const scope = await requireScope();
  const orgId = scope.orgId;
  const sp = await searchParams;
  const dueSort = sp.due === "amount" ? "amount" : "date";
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "due";
  const bookings = await prisma.booking.findMany({
    where: scope.viaTrip,
    include: { trip: true, variant: true, payments: true, schedule: true },
  });
  const recent = await prisma.payment.findMany({
    where: { booking: { ...scope.viaTrip, deletedAt: null } },
    take: 25,
    orderBy: { date: "desc" },
    include: { booking: { include: { trip: true } } },
  });
  const pending = await prisma.pendingPayment.findMany({
    where: { OR: [{ booking: { ...scope.viaTrip, deletedAt: null } }, { trip: scope.tripWhere }] },
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { trip: true } }, trip: true },
  });

  const owing = bookings
    .filter((b) => isActive(b.status) && bookingBalance(b) > 0)
    .sort((a, c) => bookingBalance(c) - bookingBalance(a));

  const totalDue = owing.reduce((s, b) => s + bookingBalance(b), 0);
  const totalCollected = bookings.reduce((s, b) => s + bookingPaid(b), 0);

  // Money due from payment plans. Per customer we total EVERYTHING that should
  // already be in — every unpaid installment dated today or earlier — so a reminder
  // asks for the full amount owed, not just the next single step. If nothing is due
  // yet, we surface the next upcoming installment so it's still on the radar.
  const now = new Date();
  const dayStart = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const today0 = dayStart(now);
  const dueRows = bookings
    .filter((b) => isActive(b.status) && !b.deletedAt && b.schedule.length > 0)
    .map((b) => {
      const lines = scheduleStatus(b.schedule.map((s) => ({ id: s.id, label: s.label, amount: s.amount, dueDate: s.dueDate, order: s.order })), bookingPaid(b), { invoiceTotal: bookingTotal(b), now });
      const uncovered = lines.filter((l) => !l.covered);
      const dueNow = uncovered.filter((l) => l.item.dueDate && dayStart(new Date(l.item.dueDate)) <= today0);
      if (dueNow.length > 0) {
        const amount = dueNow.reduce((s, l) => s + l.remaining, 0);
        const earliest = Math.min(...dueNow.map((l) => new Date(l.item.dueDate!).getTime()));
        return { b, amount, date: new Date(earliest), count: dueNow.length, overdue: earliest < today0, label: dueNow.length === 1 ? dueNow[0].item.label : `${dueNow.length} installments` };
      }
      const nextUp = uncovered.find((l) => l.item.dueDate);
      if (!nextUp) return null;
      return { b, amount: nextUp.remaining, date: new Date(nextUp.item.dueDate!), count: 1, overdue: false, label: nextUp.item.label };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, c) => dueSort === "amount" ? c.amount - a.amount : a.date.getTime() - c.date.getTime());
  const overdueCount = dueRows.filter((r) => r.overdue).length;

  // "Money due" (what should be in today, from the payment plan) and
  // "Outstanding" (everything still unpaid) answered the same question — who owes
  // me — so they're one list with both figures side by side. Bookings without a
  // payment plan still appear, they just have nothing "due now".
  const dueById = new Map(dueRows.map((r) => [r.b.id, r]));
  const moneyRows = bookings
    .filter((b) => isActive(b.status) && !b.deletedAt)
    .map((b) => {
      const d = dueById.get(b.id);
      return {
        b,
        balance: bookingBalance(b),
        dueNow: d?.amount ?? 0,
        date: d?.date ?? null,
        overdue: d?.overdue ?? false,
        label: d?.label ?? null,
        count: d?.count ?? 1,
      };
    })
    .filter((r) => r.balance > 0 || r.dueNow > 0)
    .sort((a, c) => {
      if (dueSort === "amount") return c.balance - a.balance;
      const at = a.date ? a.date.getTime() : Infinity; // undated (no plan) last
      const ct = c.date ? c.date.getTime() : Infinity;
      return at - ct;
    });

  // Free-cancellation windows closing within the next 10 days — nudge the customer
  // before their free-cancel date passes. Soonest first.
  const CANCEL_WINDOW_DAYS = 10;
  const soonMs = now.getTime() + CANCEL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const closingRows = bookings
    .filter((b) => isActive(b.status) && !b.deletedAt && b.freeCancelUntil != null)
    .map((b) => ({ b, until: new Date(b.freeCancelUntil!) }))
    .filter(({ until }) => until.getTime() >= startOfToday.getTime() && until.getTime() <= soonMs)
    .sort((a, c) => a.until.getTime() - c.until.getTime());
  const daysLeft = (d: Date) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));

  // Pick-from-list of existing customers/groups — payments only ever attach to
  // a booking that already exists (no new customers created here).
  const payable = bookings
    .filter((b) => isActive(b.status))
    .map((b) => ({ b, bal: bookingBalance(b) }))
    .sort((a, c) => (c.bal - a.bal) || a.b.customerName.localeCompare(c.b.customerName));

  const TABS: { key: View; label: string; count: number; alert?: boolean }[] = [
    { key: "due", label: "Who owes you", count: moneyRows.length, alert: overdueCount > 0 },
    { key: "record", label: "Record a payment", count: 0 },
    { key: "history", label: "Payment receipts", count: 0 },
    { key: "approve", label: "To approve", count: pending.length, alert: pending.length > 0 },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p className="sub">{formatINR(totalCollected)} collected · {formatINR(totalDue)} outstanding{pending.length > 0 ? ` · ${pending.length} awaiting approval` : ""}</p>
        </div>
        <a className="btn sm" href="/api/export/payments" title="Download all payments as a spreadsheet (CSV)">⬇ Download CSV</a>
      </div>

      {/* One thing at a time — this page had seven stacked sections and was a
          long scroll on a phone. Counts stay on the tabs so nothing gets missed. */}
      <div className="flex" style={{ gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/payments?view=${t.key}`} className={`btn sm ${view === t.key ? "primary" : ""}`}>
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft: 6, fontWeight: 700, opacity: view === t.key ? 0.9 : 1, color: view === t.key ? "#fff" : t.alert ? "var(--rose-fg)" : "var(--text-3)" }}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {view === "due" && (<>
      {moneyRows.length === 0 && closingRows.length === 0 && (
        <div className="card"><div className="empty">Everyone&apos;s paid up. Nice.</div></div>
      )}
      {/* WHO OWES YOU — what's due right now plus the full remaining balance. */}
      {moneyRows.length > 0 && (
        <div className="card">
          <div className="between" style={{ marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div className="card-title" style={{ margin: 0 }}>Who owes you <span className="small muted">{formatINR(totalDue)} outstanding{overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}</span></div>
            <div className="flex" style={{ gap: 6 }}>
              <span className="small muted" style={{ alignSelf: "center" }}>Sort:</span>
              <Link href="/payments?view=due&due=date" className={`btn sm ${dueSort === "date" ? "primary" : ""}`}>By due date</Link>
              <Link href="/payments?view=due&due=amount" className={`btn sm ${dueSort === "amount" ? "primary" : ""}`}>Owes most</Link>
            </div>
          </div>
          <TableSearch placeholder="Search customer or trip…">
          <table className="t">
            <thead><tr><th>Due date</th><th>Customer</th><th>Trip</th><th>For</th><th className="num">Due now</th><th className="num">Total left</th><th></th></tr></thead>
            <tbody>
              {moneyRows.map((r) => (
                <tr key={r.b.id}>
                  <td className="small">
                    {r.date
                      ? (r.overdue ? <span className="badge rose">{fmtDate(r.date)}</span> : <span className="muted">{fmtDate(r.date)}</span>)
                      : <span className="muted small">no plan</span>}
                  </td>
                  <td>
                    <Link className="row-link" href={`/bookings/${r.b.id}`}>{r.b.customerName}</Link>
                    {/* Visa state alongside the name: chasing money and chasing
                        documents happen in the same phone call. A short tag, not
                        the full label, so the money columns keep their width —
                        and nothing at all when no visa is needed. */}
                    {r.b.visaStatus && r.b.visaStatus !== "not_required" && (
                      <span
                        className={`badge xs ${visaMeta(r.b.visaStatus).badge}`}
                        style={{ marginLeft: 7 }}
                        title={visaMeta(r.b.visaStatus).label}
                      >
                        {visaMeta(r.b.visaStatus).tiny}
                      </span>
                    )}
                  </td>
                  <td className="muted small">{r.b.trip.name}</td>
                  <td className="muted small">{r.label ?? "—"}</td>
                  <td className="num" style={{ fontWeight: 600, color: r.dueNow > 0 ? (r.overdue ? "var(--rose-fg)" : "var(--text)") : "var(--text-3)" }}>
                    {r.dueNow > 0 ? formatINR(r.dueNow) : "—"}
                  </td>
                  <td className="num">{r.balance > 0 ? <span className="badge amber">{formatINR(r.balance)}</span> : <span className="badge green">paid</span>}</td>
                  <td className="num">
                    <RemindPayment
                      phone={r.b.customerPhone}
                      customerName={r.b.customerName}
                      amount={formatINR(r.dueNow > 0 ? r.dueNow : r.balance)}
                      dueLabel={r.date ? fmtDate(r.date) : null}
                      tripName={r.b.trip.name}
                      payPath={`/pay/${r.b.id}`}
                      overdue={r.overdue}
                      count={r.count}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        </div>
      )}

      {/* FREE-CANCELLATION WINDOWS CLOSING — heads-up before the date passes. */}
      {closingRows.length > 0 && (
        <div className="card">
          <div className="card-title">Free cancellation closing <span className="small muted">within {CANCEL_WINDOW_DAYS} days · give the customer a heads-up before the window shuts</span></div>
          <table className="t">
            <thead><tr><th>Free until</th><th>Customer</th><th>Trip</th><th>Left</th><th></th></tr></thead>
            <tbody>
              {closingRows.map(({ b, until }) => {
                const d = daysLeft(until);
                return (
                  <tr key={b.id}>
                    <td className="small muted">{fmtDate(until)}</td>
                    <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.customerName}</Link></td>
                    <td className="muted small">{b.trip.name}</td>
                    <td><span className={`badge ${d <= 2 ? "rose" : "amber"}`}>{d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`}</span></td>
                    <td className="num"><RemindCancelWindow phone={b.customerPhone} customerName={b.customerName} tripName={b.trip.name} dateLabel={fmtDate(until)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {view === "approve" && (<>
      {pending.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div className="card-title" style={{ color: "var(--warning)" }}>🔔 Customer-submitted payments — approve to record</div>
          <div className="stack">
            {pending.map((p) => (
              <div key={p.id} className="between" style={{ background: "var(--surface)", borderRadius: 10, padding: "12px 14px", gap: 12, flexWrap: "wrap" }}>
                <div className="flex" style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                  {p.screenshot ? (
                    <a href={p.screenshot} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.screenshot} alt="proof" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
                    </a>
                  ) : <div style={{ width: 54, height: 54, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 11, color: "var(--text-3)" }}>no img</div>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{formatINR(p.amount)} <span className="badge gray">{p.mode}</span>{!p.booking && <span className="badge amber" style={{ marginLeft: 6 }}>unmatched</span>}</div>
                    <div className="small muted">{p.payerName || p.booking?.customerName || "—"} · {p.booking?.trip.name || p.trip?.name || "—"} · {fmtDate(p.date)}{p.reference ? ` · ref ${p.reference}` : ""}</div>
                    {p.note ? <div className="small" style={{ color: "var(--text-3)" }}>{p.note}</div> : null}
                  </div>
                </div>
                {p.booking ? (
                  <div className="flex" style={{ gap: 8 }}>
                    <form action={approvePendingPayment}><input type="hidden" name="id" value={p.id} /><button className="primary sm" type="submit">Approve</button></form>
                    <form action={rejectPendingPayment}><input type="hidden" name="id" value={p.id} /><button className="danger sm" type="submit">Reject</button></form>
                  </div>
                ) : (
                  <div className="flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <form action={approvePendingPayment} className="flex" style={{ gap: 8, alignItems: "center" }}>
                      <input type="hidden" name="id" value={p.id} />
                      <select name="bookingId" defaultValue="" required style={{ fontSize: 13, maxWidth: 200 }}>
                        <option value="" disabled>Link to customer…</option>
                        {bookings.filter((b) => b.tripId === p.tripId && isActive(b.status)).map((b) => (
                          <option key={b.id} value={b.id}>{b.customerName}</option>
                        ))}
                      </select>
                      <button className="primary sm" type="submit">Approve</button>
                    </form>
                    <form action={rejectPendingPayment}><input type="hidden" name="id" value={p.id} /><button className="danger sm" type="submit">Reject</button></form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

        {pending.length === 0 && <div className="card"><div className="empty">Nothing waiting for approval.</div></div>}
      </>)}

      {view === "record" && (<>
      <div className="card">
        <div className="card-title">Record a payment <span className="small muted">type a name to find an existing customer</span></div>
        {payable.length === 0 ? (
          <div className="empty">No bookings yet. Add a booking on a trip first, then you can record payments here.</div>
        ) : (
          <form action={addPayment}>
            <div className="row-3">
              <label className="field"><span className="lbl">Customer · group</span>
                <Combobox
                  name="bookingId"
                  placeholder="Type a name…"
                  emptyHint="No match. New customers are added from a trip booking."
                  options={payable.map(({ b, bal }) => ({
                    id: b.id,
                    label: b.customerName,
                    sub: `${b.trip.name}${bal > 0 ? ` · ${formatINRShort(bal)} due` : " · fully paid"}`,
                  }))}
                />
              </label>
              <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="40000 or 40k" required /></label>
              <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
            </div>
            <div className="row-3">
              <label className="field"><span className="lbl">Mode</span>
                <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
              </label>
              <label className="field"><span className="lbl">Note</span><input name="note" placeholder="advance / installment 2" /></label>
              <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}>
                <SubmitButton className="primary" pendingLabel="Recording…">Record payment</SubmitButton>
              </div>
            </div>
            <p className="small muted" style={{ margin: 0 }}>Don’t see someone? They need a booking on a trip first — that’s the only place a new customer is created.</p>
          </form>
        )}
      </div>

      <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
        <div className="card-title">🔗 Universal payment link <span className="small muted">one link for everyone — they pick their trip &amp; name</span></div>
        <CopyLink path={`/pay/o/${orgId}`} label="Copy link" waText="Please confirm your payment here:" />
        <p className="small muted" style={{ margin: "8px 0 0" }}>Share this once (WhatsApp group, email signature, anywhere). Each person selects their trip and name, then reports what they paid — it lands below for your approval.</p>
      </div>

      </>)}

      {view === "history" && (<>
      <div className="card">
        <div className="card-title">Payment receipts <span className="small muted">every payment recorded · share a receipt with the customer</span></div>
        {recent.length === 0 ? (
          <div className="empty">No payments recorded yet.</div>
        ) : (
          <TableSearch placeholder="Search customer, trip or mode…" tags={["upi", "cash", "card", "bank"]}>
          <table className="t">
            <thead><tr><th>Date</th><th>Customer</th><th>Trip</th><th>Mode</th><th className="num">Amount</th><th className="num">Receipt</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td className="muted small">{fmtDate(p.date)}</td>
                  <td><Link className="row-link" href={`/bookings/${p.bookingId}`}>{p.booking.customerName}</Link></td>
                  <td className="muted">{p.booking.trip.name}</td>
                  <td><span className="badge gray">{p.mode}</span></td>
                  <td className="num" style={{ fontWeight: 500 }}>{formatINR(p.amount)}</td>
                  <td className="num"><ShareReceipt paymentId={p.id} customerName={p.booking.customerName} amount={formatINR(p.amount)} phone={p.booking.customerPhone} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        )}
      </div>

      <ActivityLog category="payment" title="Payment activity — recorded & removed" />
      </>)}
    </>
  );
}
