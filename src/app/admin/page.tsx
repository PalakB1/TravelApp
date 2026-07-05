import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { approveOrg, rejectOrg, suspendOrg, enterOrgAction, toggleCustomTrips } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  suspended: "gray",
};

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isPlatformAdmin) redirect("/dashboard");

  const orgs = await prisma.organization.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { users: true, trips: true, customers: true } },
      users: { orderBy: { createdAt: "asc" }, take: 1, select: { name: true, email: true } },
    },
  });

  const pending = orgs.filter((o) => o.status === "pending");
  const others = orgs.filter((o) => o.status !== "pending");
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div className="page-head">
        <div>
          <h1>🛡️ Platform admin</h1>
          <p className="sub">{orgs.length} organization{orgs.length === 1 ? "" : "s"} · {pending.length} awaiting approval</p>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <Link className="btn" href="/settings">Change password</Link>
          <Link className="btn" href="/dashboard">← Back to my dashboard</Link>
        </div>
      </div>

      {pending.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, margin: "18px 0 10px", color: "var(--text-2)" }}>Awaiting approval</h2>
          <div className="card" style={{ padding: 0 }}>
            <table className="t">
              <thead><tr><th style={{ paddingLeft: 20 }}>Organization</th><th>Owner</th><th>Requested</th><th></th></tr></thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.id}>
                    <td style={{ paddingLeft: 20 }}><b>{o.name}</b></td>
                    <td className="small muted">{o.users[0]?.name}<br />{o.users[0]?.email}</td>
                    <td className="small muted">{fmt(o.createdAt)}</td>
                    <td className="num">
                      <div className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
                        <form action={approveOrg}><input type="hidden" name="orgId" value={o.id} /><button className="primary sm" type="submit">Approve</button></form>
                        <form action={rejectOrg}><input type="hidden" name="orgId" value={o.id} /><button className="sm" type="submit">Reject</button></form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 style={{ fontSize: 15, margin: "24px 0 10px", color: "var(--text-2)" }}>All organizations</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="t">
          <thead><tr><th style={{ paddingLeft: 20 }}>Organization</th><th>Status</th><th>Custom trips</th><th className="num">Users</th><th className="num">Trips</th><th className="num">Customers</th><th></th></tr></thead>
          <tbody>
            {others.map((o) => (
              <tr key={o.id}>
                <td style={{ paddingLeft: 20 }}><b>{o.name}</b><br /><span className="small muted">{o.users[0]?.email}</span></td>
                <td><span className={`badge ${STATUS_BADGE[o.status] || "gray"}`}>{o.status}</span></td>
                <td>
                  <form action={toggleCustomTrips}>
                    <input type="hidden" name="orgId" value={o.id} />
                    <input type="hidden" name="enable" value={o.customTripsEnabled ? "no" : "yes"} />
                    <button className={`sm ${o.customTripsEnabled ? "" : ""}`} type="submit" title="Toggle the Custom trips module">
                      {o.customTripsEnabled ? "🟢 On — turn off" : "○ Off — turn on"}
                    </button>
                  </form>
                </td>
                <td className="num">{o._count.users}</td>
                <td className="num">{o._count.trips}</td>
                <td className="num">{o._count.customers}</td>
                <td className="num">
                  <div className="flex" style={{ gap: 8, justifyContent: "flex-end" }}>
                    <form action={enterOrgAction}><input type="hidden" name="orgId" value={o.id} /><button className="sm" type="submit" title="Open this org's dashboard">Enter →</button></form>
                    {o.status === "approved"
                      ? <form action={suspendOrg}><input type="hidden" name="orgId" value={o.id} /><button className="sm" type="submit">Suspend</button></form>
                      : <form action={approveOrg}><input type="hidden" name="orgId" value={o.id} /><button className="primary sm" type="submit">Approve</button></form>}
                  </div>
                </td>
              </tr>
            ))}
            {others.length === 0 && <tr><td colSpan={7} className="empty">No approved organizations yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 15, margin: "24px 0 10px", color: "var(--text-2)" }}>Signup interest <span className="small muted">emails captured on the landing page</span></h2>
      <div className="card" style={{ padding: 0 }}>
        {leads.length === 0 ? (
          <div className="empty">No leads yet.</div>
        ) : (
          <table className="t">
            <thead><tr><th style={{ paddingLeft: 20 }}>Email</th><th>Source</th><th>When</th></tr></thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td style={{ paddingLeft: 20 }}>{l.email}</td>
                  <td className="muted small">{l.source || "—"}</td>
                  <td className="muted small">{l.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
