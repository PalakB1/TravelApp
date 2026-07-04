import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import EscToClose from "@/components/EscToClose";
import CollapseOnSave from "@/components/CollapseOnSave";
import { logout } from "./actions";

function WaitingScreen({ status, name, orgName }: { status: string; name: string; orgName?: string }) {
  const rejected = status === "rejected";
  const suspended = status === "suspended";
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 440, maxWidth: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{rejected ? "🚫" : suspended ? "⏸️" : "⏳"}</div>
        <h1 style={{ marginBottom: 6 }}>
          {rejected ? "Application not approved" : suspended ? "Workspace paused" : "Almost there!"}
        </h1>
        <p className="muted" style={{ marginBottom: 4 }}>Hi {name},</p>
        <p className="muted small">
          {rejected
            ? `We couldn't approve ${orgName || "your workspace"} at this time. Please get in touch if you think this is a mistake.`
            : suspended
              ? `${orgName || "Your workspace"} is currently paused. Please contact us to reactivate it.`
              : `${orgName || "Your workspace"} has been created and is waiting for approval. You'll be able to sign in as soon as we switch it on.`}
        </p>
        <form action={logout} style={{ marginTop: 18 }}>
          <button className="sm" style={{ width: "100%", justifyContent: "center" }} type="submit">Sign out</button>
        </form>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  // A normal user only gets in if their org is approved. The platform admin
  // always gets in (they operate their own org and can enter others).
  if (!ctx.isPlatformAdmin) {
    const org = ctx.orgId
      ? await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { status: true, name: true } })
      : null;
    if (!org || org.status !== "approved") {
      return <WaitingScreen status={org?.status ?? "unknown"} name={ctx.session.name} orgName={org?.name} />;
    }
  }

  return (
    <div className="app">
      <EscToClose />
      <CollapseOnSave />
      <Sidebar name={ctx.session.name} isPlatformAdmin={ctx.isPlatformAdmin} actingOrgId={ctx.actingOrgId} />
      <main className="main">{children}</main>
    </div>
  );
}
