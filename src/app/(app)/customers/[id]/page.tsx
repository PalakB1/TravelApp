import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingTotal, bookingPaid, bookingBalance, isActive } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { updateCustomer } from "../../data-actions";

export const dynamic = "force-dynamic";

const PACKAGE: Record<string, string> = { land: "Land", lva: "LVA", full: "Full" };
function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function statusBadge(s: string) {
  const map: Record<string, string> = { confirmed: "green", travelled: "accent", enquiry: "amber", cancelled: "red" };
  return <span className={`badge ${map[s] || "gray"}`}>{s}</span>;
}

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.customer.findUnique({
    where: { id },
    include: { bookings: { include: { trip: true, variant: true, payments: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!c) notFound();

  const active = c.bookings.filter((b) => isActive(b.status));
  const trips = new Set(active.map((b) => b.tripId)).size;
  const invoiced = active.reduce((s, b) => s + bookingTotal(b), 0);
  const paid = active.reduce((s, b) => s + bookingPaid(b), 0);
  const outstanding = active.reduce((s, b) => s + bookingBalance(b), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/customers" style={{ color: "var(--text-2)" }}>← Customers</Link></div>
          <h1 style={{ marginTop: 6 }}>{c.name}</h1>
          <p className="sub">{[c.phone, c.email].filter(Boolean).join(" · ") || "No contact details yet"}</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric c-sky"><div className="label">Trips</div><div className="value">{trips}</div><div className="foot">{active.length} bookings</div></div>
        <div className="metric c-violet"><div className="label">Invoiced</div><div className="value">{formatINR(invoiced)}</div></div>
        <div className="metric c-emerald"><div className="label">Paid</div><div className="value">{formatINR(paid)}</div></div>
        <div className={`metric ${outstanding > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Outstanding</div><div className="value">{formatINR(outstanding)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Trips &amp; bookings</div>
        {c.bookings.length === 0 ? (
          <div className="empty">No bookings yet.</div>
        ) : (
          <table className="t">
            <thead><tr><th>Trip</th><th>Package</th><th>Pax</th><th>Status</th><th className="num">Invoice</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead>
            <tbody>
              {c.bookings.map((b) => {
                const bal = bookingBalance(b);
                return (
                  <tr key={b.id}>
                    <td><Link className="row-link" href={`/bookings/${b.id}`}>{b.trip.name}</Link><div className="small muted">{fmtDate(b.trip.departureDate)}</div></td>
                    <td className="muted">{PACKAGE[b.packageType] || b.packageType}</td>
                    <td className="muted">{b.pax}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td className="num">{formatINR(bookingTotal(b))}</td>
                    <td className="num">{formatINR(bookingPaid(b))}</td>
                    <td className="num">{bal > 0 ? <span className="badge amber">{formatINR(bal)}</span> : <span className="badge green">paid</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-title">Contact details</div>
        <form action={updateCustomer}>
          <input type="hidden" name="id" value={c.id} />
          <div className="row-3">
            <label className="field"><span className="lbl">Name</span><input name="name" defaultValue={c.name} /></label>
            <label className="field"><span className="lbl">Phone</span><input name="phone" defaultValue={c.phone || ""} /></label>
            <label className="field"><span className="lbl">Email</span><input name="email" defaultValue={c.email || ""} /></label>
          </div>
          <label className="field"><span className="lbl">Notes</span><textarea name="notes" rows={2} defaultValue={c.notes || ""} placeholder="Preferences, passport details to chase, anything to remember" /></label>
          <button className="primary sm" type="submit">Save customer</button>
        </form>
      </div>
    </>
  );
}
