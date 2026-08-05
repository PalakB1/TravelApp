import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import AddMemberForm from "./AddMemberForm";
import ResetPasswordForm from "./ResetPasswordForm";
import { removeMember, setTripAccess, setOrgAdmin } from "./actions";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TeamPage() {
  const ctx = await getOrgContext();
  const orgId = ctx?.orgId ?? null;
  const meId = ctx?.session.userId;

  const viewerIsPlatformAdmin = !!ctx?.isPlatformAdmin;
  const members = orgId
    ? await prisma.user.findMany({
        // Hide the platform-admin account from the agency's own view.
        where: { orgId, ...(viewerIsPlatformAdmin ? {} : { isPlatformAdmin: false }) },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, isPlatformAdmin: true, isOrgAdmin: true, createdAt: true, tripScoped: true, tripAccess: { select: { tripId: true } } },
      })
    : [];
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }) : null;
  // Only admins can invite, remove, change access or promote.
  const canManage = !!ctx?.isPlatformAdmin || members.some((m) => m.id === meId && m.isOrgAdmin);
  // Platform admins don't count as the company's admin — every workspace must
  // keep at least one of its OWN admins.
  const orgAdmins = members.filter((m) => m.isOrgAdmin && !m.isPlatformAdmin);
  const adminCount = orgAdmins.length;
  const trips = orgId
    ? await prisma.trip.findMany({ where: { orgId }, orderBy: [{ departureDate: "desc" }], select: { id: true, name: true } })
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p className="sub">{members.length} member{members.length === 1 ? "" : "s"}{org ? ` in ${org.name}` : ""} · {adminCount} admin{adminCount === 1 ? "" : "s"}{canManage ? "" : " · only an admin can make changes here"}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <TableSearch placeholder="Search member…">
        <table className="t">
          <thead><tr><th style={{ paddingLeft: 20 }}>Member</th><th>Email</th><th>Role</th><th>Trip access</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ paddingLeft: 20 }}><b>{m.name}</b>{m.id === meId ? <span className="small muted"> · you</span> : ""}</td>
                <td className="muted small">{m.email}</td>
                <td>
                  <div className="flex" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    {m.isPlatformAdmin
                      ? <span className="badge violet">platform admin</span>
                      : m.isOrgAdmin ? <span className="badge accent">admin</span> : <span className="badge gray">member</span>}
                    {canManage && !m.isPlatformAdmin && (
                      <form action={setOrgAdmin}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="makeAdmin" value={m.isOrgAdmin ? "0" : "1"} />
                        <button
                          className="sm"
                          type="submit"
                          disabled={m.isOrgAdmin && adminCount <= 1}
                          title={m.isOrgAdmin && adminCount <= 1 ? "There must always be at least one admin" : m.isOrgAdmin ? "Step this person back down to member" : "Let this person manage the team"}
                        >
                          {m.isOrgAdmin ? "Make member" : "Make admin"}
                        </button>
                      </form>
                    )}
                  </div>
                </td>
                <td>
                  {m.isPlatformAdmin ? (
                    <span className="muted small">All trips</span>
                  ) : !canManage ? (
                    <span className="muted small">{m.tripScoped ? `${m.tripAccess.length} of ${trips.length} trips` : "All trips"}</span>
                  ) : (
                    <details className="menu-pop" style={{ position: "relative" }}>
                      <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }} title="Change what this member can see">
                        {m.tripScoped ? `${m.tripAccess.length} of ${trips.length} trips` : "All trips"} <span aria-hidden style={{ fontSize: 10, opacity: 0.7 }}>▾ edit</span>
                      </summary>
                      <div className="menu-pop-panel">
                        <div style={{ fontWeight: 500, marginBottom: 8 }}>What can {m.name.split(" ")[0]} see?</div>
                        <form action={setTripAccess}>
                          <input type="hidden" name="userId" value={m.id} />
                          <label className="flex" style={{ gap: 8, marginBottom: 6, cursor: "pointer" }}>
                            <input type="radio" name="scoped" value="all" defaultChecked={!m.tripScoped} /> <span className="small">Every trip</span>
                          </label>
                          <label className="flex" style={{ gap: 8, marginBottom: 8, cursor: "pointer" }}>
                            <input type="radio" name="scoped" value="limited" defaultChecked={m.tripScoped} /> <span className="small">Only the trips I tick</span>
                          </label>
                          <div style={{ maxHeight: 170, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                            {trips.length === 0 && <span className="small muted">No trips yet.</span>}
                            {trips.map((t) => (
                              <label key={t.id} className="flex" style={{ gap: 8, cursor: "pointer" }}>
                                <input type="checkbox" name="tripIds" value={t.id} defaultChecked={m.tripAccess.some((a) => a.tripId === t.id)} />
                                <span className="small">{t.name}</span>
                              </label>
                            ))}
                          </div>
                          <button className="primary sm" type="submit" style={{ marginTop: 10 }}>Save access</button>
                        </form>
                      </div>
                    </details>
                  )}
                </td>
                <td className="muted small">{fmt(m.createdAt)}</td>
                <td className="num">
                  {m.isPlatformAdmin || !canManage ? <span className="muted small">—</span> : (
                    <div className="flex" style={{ gap: 6, justifyContent: "flex-end" }}>
                      <ResetPasswordForm id={m.id} name={m.name} />
                      {m.id !== meId && (
                        <form action={removeMember}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="sm" type="submit">Remove</button>
                        </form>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </TableSearch>
      </div>

      {canManage && (
      <div className="card">
        <div className="card-title">Add a team member</div>
        <p className="muted small" style={{ marginTop: -4, marginBottom: 16 }}>
          They join <b>{org?.name ?? "this workspace"}</b> and can sign in right away with the temporary password — ask them to change it under Settings.
        </p>
        <AddMemberForm />
      </div>
      )}
    </>
  );
}
