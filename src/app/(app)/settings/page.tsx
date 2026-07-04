import { getSession } from "@/lib/auth";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const ctx = await getOrgContext();
  const org = ctx?.orgId ? await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { name: true } }) : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Signed in as {session?.email}{org ? ` · ${org.name}` : ""}{session?.isPlatformAdmin ? " · platform admin" : ""}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Change password</div>
        <p className="muted small" style={{ marginTop: -4, marginBottom: 16 }}>
          Set a password only you know. You’ll need your current password to confirm it’s you.
        </p>
        <ChangePasswordForm />
      </div>
    </>
  );
}
