import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import AddMemberForm from "./AddMemberForm";
import { removeMember } from "./actions";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function TeamPage() {
  const ctx = await getOrgContext();
  const orgId = ctx?.orgId ?? null;
  const meId = ctx?.session.userId;

  const members = orgId
    ? await prisma.user.findMany({ where: { orgId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, isPlatformAdmin: true, createdAt: true } })
    : [];
  const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }) : null;

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
          <thead><tr><th style={{ paddingLeft: 20 }}>Member</th><th>Email</th><th>Role</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ paddingLeft: 20 }}><b>{m.name}</b>{m.id === meId ? <span className="small muted"> · you</span> : ""}</td>
                <td className="muted small">{m.email}</td>
                <td>{m.isPlatformAdmin ? <span className="badge violet">platform admin</span> : <span className="badge gray">member</span>}</td>
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
