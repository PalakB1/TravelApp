import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import { isTrialExpired, trialDaysLeft } from "@/lib/billing";
import Sidebar from "@/components/Sidebar";
import EscToClose from "@/components/EscToClose";
import CollapseOnSave from "@/components/CollapseOnSave";
import SaveToast from "@/components/SaveToast";
import TableLabels from "@/components/TableLabels";
import BottomNav from "@/components/BottomNav";
import { logout } from "./actions";

function TrialEndedScreen({ name, orgName }: { name: string; orgName?: string }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 460, maxWidth: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔓</div>
        <h1 style={{ marginBottom: 6 }}>Your free trial has ended</h1>
        <p className="muted small">Hi {name}, {orgName || "your workspace"}’s 30-day trial is over. Your data is safe — pick a plan to pick up right where you left off.</p>
        <div className="flex" style={{ gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          <Link className="btn primary sm" href="/pricing">See plans</Link>
          <form action={logout}><button className="sm" type="submit">Sign out</button></form>
        </div>
      </div>
    </div>
  );
}

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

  const org = ctx.orgId
    ? await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { status: true, name: true, customTripsEnabled: true, plan: true, trialEndsAt: true } })
    : null;

  // A normal user only gets in if their org is approved. The platform admin
  // always gets in (they operate their own org and can enter others).
  if (!ctx.isPlatformAdmin && (!org || org.status !== "approved")) {
    return <WaitingScreen status={org?.status ?? "unknown"} name={ctx.session.name} orgName={org?.name} />;
  }
  // Trial ended and no paid plan → soft-lock until they upgrade (admin exempt).
  if (!ctx.isPlatformAdmin && org && isTrialExpired(org)) {
    return <TrialEndedScreen name={ctx.session.name} orgName={org.name} />;
  }
  const daysLeft = org ? trialDaysLeft(org) : null;

  return (
    <div className="app">
      <EscToClose />
      <CollapseOnSave />
      <SaveToast />
      <TableLabels />
      <Sidebar name={ctx.session.name} isPlatformAdmin={ctx.isPlatformAdmin} actingOrgId={ctx.actingOrgId} customTrips={org?.customTripsEnabled ?? false} />
      <main className="main">
        {daysLeft != null && (
          <Link href="/pricing" className="between" style={{ display: "flex", background: daysLeft <= 5 ? "var(--warning-bg)" : "var(--accent-bg)", borderRadius: 10, padding: "9px 14px", marginBottom: 14, fontSize: 13.5 }}>
            <span>✨ <b>{daysLeft} day{daysLeft === 1 ? "" : "s"}</b> left in your free trial{daysLeft <= 5 ? " — don’t lose access to your data" : ""}.</span>
            <span style={{ color: "var(--accent)", fontWeight: 600, whiteSpace: "nowrap" }}>See plans →</span>
          </Link>
        )}
        {children}
      </main>
      <BottomNav name={ctx.session.name} isPlatformAdmin={ctx.isPlatformAdmin} actingOrgId={ctx.actingOrgId} customTrips={org?.customTripsEnabled ?? false} />
    </div>
  );
}
