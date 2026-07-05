import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/org";
import { bookingTotal, bookingPaid, bookingBalance, isActive } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import TableSearch from "@/components/TableSearch";
import ActivityLog from "@/components/ActivityLog";
import Stamp from "@/components/Stamp";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const orgId = await requireOrgId();
  const customers = await prisma.customer.findMany({
    where: { orgId },
    include: { bookings: { include: { variant: true, payments: true, trip: true } } },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((c) => {
    const active = c.bookings.filter((b) => isActive(b.status));
    const tripNames = [...new Set(active.map((b) => b.trip.name))];
    const invoiced = active.reduce((s, b) => s + bookingTotal(b), 0);
    const paid = active.reduce((s, b) => s + bookingPaid(b), 0);
    const outstanding = active.reduce((s, b) => s + bookingBalance(b), 0);
    return { c, tripNames, bookings: active.length, invoiced, paid, outstanding };
  });
  const totalOut = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p className="sub">{customers.length} customers · {formatINR(totalOut)} outstanding</p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="card"><div className="empty">No customers yet. They’re created automatically when you add a booking.</div></div>
      ) : (
        <div className="card" style={{ padding: "18px 20px" }}>
          <TableSearch placeholder="Search name, phone or trip…">
          <table className="t">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Customer</th><th>Phone</th><th>Added</th><th>Trips</th>
                <th className="num">Invoiced</th><th className="num">Paid</th><th className="num">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, tripNames, invoiced, paid, outstanding }) => (
                <tr key={c.id}>
                  <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/customers/${c.id}`}>{c.name}</Link></td>
                  <td className="muted small">{c.phone || "—"}</td>
                  <td><Stamp created={c.createdAt} updated={c.updatedAt} /></td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {tripNames.length ? tripNames.map((tn) => <span key={tn} className="badge accent">{tn}</span>) : <span className="muted small">—</span>}
                    </div>
                  </td>
                  <td className="num">{formatINR(invoiced)}</td>
                  <td className="num">{formatINR(paid)}</td>
                  <td className="num">{outstanding > 0 ? <span className="badge amber">{formatINR(outstanding)}</span> : <span className="badge green">clear</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        </div>
      )}

      <ActivityLog category="customer" title="Customer activity — added & deleted" />
    </>
  );
}
