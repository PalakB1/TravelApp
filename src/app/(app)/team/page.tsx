import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import AddMemberForm from "./AddMemberForm";
import { removeMember, setTripAccess } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TeamPage() {
  const ctx = await getOrgContext();
  const orgId = ctx?.orgId ?? null;
  const meId = ctx?.session.userId;

  const members = orgId
    ? await prisma.user.findMany({
        where: { orgId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, isPlatformAdmin: true, createdAt: true, tripScoped: true, tripAccess: { select: { tripId: true } } },
      })
    : [];
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }) : null;
  const trips = orgId
    ? await prisma.trip.findMany({ where: { orgId }, orderBy: [{ departureDate: "desc" }], select: { id: true, name: true } })
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Team</h1>
          <p className="sub">{members.length} member{members.length === 1 ? "" : "s"}{org ? ` in ${org.name}` : ""} · everyone has equal access</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="t">
          <thead><tr><th style={{ paddingLeft: 20 }}>Member</th><th>Email</th><th>Role</th><th>Trip access</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ paddingLeft: 20 }}><b>{m.name}</b>{m.id === meId ? <span className="small muted"> · you</span> : ""}</td>
                <td className="muted small">{m.email}</td>
                <td>{m.isPlatformAdmin ? <span className="badge violet">platform admin</span> : <span className="badge gray">member</span>}</td>
                <td>
                  {m.isPlatformAdmin ? (
                    <span className="muted small">All trips</span>
                  ) : (
                    <details className="menu-pop" style={{ position: "relative" }}>
                      <summary className="sm" style={{ listStyle: "none", cursor: "pointer" }}>
                        {m.tripScoped ? `${m.tripAccess.length} of ${trips.length} trips` : "All trips"}
                      </summary>
                      <div style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", width: 300, maxWidth: "80vw", zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 14, textAlign: "left" }}>
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
                  {m.id !== meId && !m.isPlatformAdmin ? (
                    <form action={removeMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="sm" type="submit">Remove</button>
                    </form>
                  ) : <span className="muted small">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-title">Add a team member</div>
        <p className="muted small" style={{ marginTop: -4, marginBottom: 16 }}>
          They join <b>{org?.name ?? "this workspace"}</b> and can sign in right away with the temporary password — ask them to change it under Settings.
        </p>
        <AddMemberForm />
      </div>
    </>
  );
}
