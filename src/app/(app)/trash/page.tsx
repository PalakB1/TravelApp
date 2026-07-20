import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { formatINR } from "@/lib/money";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { restoreItem, purgeItem } from "../trash-actions";

export const dynamic = "force-dynamic";

function ago(d: Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function Row({ kind, id, title, sub, when }: { kind: string; id: string; title: string; sub?: string; when: Date | null }) {
  return (
    <div className="between" style={{ padding: "11px 0", borderBottom: "1px solid var(--border)", gap: 12, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div className="small muted">{sub ? sub + " · " : ""}deleted {ago(when)}</div>
      </div>
      <div className="flex" style={{ gap: 8 }}>
        <form action={restoreItem}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <button className="btn sm primary" type="submit">↩ Restore</button>
        </form>
        <form action={purgeItem}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit className="btn sm danger" message={`Permanently delete “${title}”? This cannot be undone.`}>Delete forever</ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}

export default async function TrashPage() {
  const scope = await requireScope();
  const orgId = scope.orgId;
  const notDeleted = { deletedAt: { not: null } as const };

  const [trips, bookings, customers, expenses, customTrips] = await Promise.all([
    prisma.trip.findMany({ where: { orgId, ...notDeleted }, orderBy: { deletedAt: "desc" }, select: { id: true, name: true, destination: true, deletedAt: true } }),
    // Only bookings deleted on their own (their trip is still alive) — trip-cascaded
    // ones are represented by the trip itself.
    prisma.booking.findMany({ where: { ...notDeleted, trip: { orgId, deletedAt: null } }, orderBy: { deletedAt: "desc" }, select: { id: true, customerName: true, deletedAt: true, trip: { select: { name: true } } } }),
    prisma.customer.findMany({ where: { orgId, ...notDeleted }, orderBy: { deletedAt: "desc" }, select: { id: true, name: true, phone: true, deletedAt: true } }),
    prisma.expense.findMany({ where: { orgId, ...notDeleted, OR: [{ tripId: null }, { trip: { deletedAt: null } }] }, orderBy: { deletedAt: "desc" }, select: { id: true, payee: true, amount: true, deletedAt: true, trip: { select: { name: true } } } }),
    prisma.customTrip.findMany({ where: { orgId, ...notDeleted }, orderBy: { deletedAt: "desc" }, select: { id: true, title: true, clientName: true, deletedAt: true } }),
  ]);

  const total = trips.length + bookings.length + customers.length + expenses.length + customTrips.length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Recycle bin</h1>
          <p className="sub">Deleted items are kept here and can be restored anytime. Nothing is removed for good unless you choose “Delete forever.”</p>
        </div>
      </div>

      {total === 0 ? (
        <div className="empty-cta">
          <span className="emoji">🗑️</span>
          <div className="t">The bin is empty</div>
          <div className="d">When you delete a trip, booking, customer, expense or custom trip, it lands here — safe to restore.</div>
        </div>
      ) : (
        <>
          {trips.length > 0 && (
            <div className="card">
              <div className="card-title">Trips <span className="small muted">{trips.length} · restoring brings back its bookings &amp; costs too</span></div>
              {trips.map((t) => <Row key={t.id} kind="trip" id={t.id} title={t.name} sub={t.destination || undefined} when={t.deletedAt} />)}
            </div>
          )}
          {bookings.length > 0 && (
            <div className="card">
              <div className="card-title">Bookings <span className="small muted">{bookings.length}</span></div>
              {bookings.map((b) => <Row key={b.id} kind="booking" id={b.id} title={b.customerName} sub={b.trip?.name} when={b.deletedAt} />)}
            </div>
          )}
          {expenses.length > 0 && (
            <div className="card">
              <div className="card-title">Costing entries <span className="small muted">{expenses.length}</span></div>
              {expenses.map((e) => <Row key={e.id} kind="expense" id={e.id} title={`${formatINR(e.amount)}${e.payee ? " · " + e.payee : ""}`} sub={e.trip?.name || "General"} when={e.deletedAt} />)}
            </div>
          )}
          {customers.length > 0 && (
            <div className="card">
              <div className="card-title">Customers <span className="small muted">{customers.length}</span></div>
              {customers.map((c) => <Row key={c.id} kind="customer" id={c.id} title={c.name} sub={c.phone || undefined} when={c.deletedAt} />)}
            </div>
          )}
          {customTrips.length > 0 && (
            <div className="card">
              <div className="card-title">Custom trips <span className="small muted">{customTrips.length}</span></div>
              {customTrips.map((ct) => <Row key={ct.id} kind="customTrip" id={ct.id} title={ct.title} sub={ct.clientName} when={ct.deletedAt} />)}
            </div>
          )}
        </>
      )}
    </>
  );
}
