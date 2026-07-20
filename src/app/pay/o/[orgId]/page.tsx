import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import UniversalPayForm from "./UniversalPayForm";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

// PUBLIC universal payment link for one agency. The payer picks their trip and
// TYPES their own name — no other customers' names are ever sent to the browser.
export default async function OrgPayPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await prisma.organization.findFirst({ where: { id: orgId, status: "approved" }, select: { id: true, name: true } });
  if (!org) notFound();

  // Only trip names (with at least one booking) — deliberately NO customer data.
  const trips = await prisma.trip.findMany({
    where: { orgId, bookings: { some: {} } },
    orderBy: [{ departureDate: "desc" }],
    select: { id: true, name: true, departureDate: true },
  });
  const list = trips.map((t) => ({ id: t.id, name: `${t.name}${t.departureDate ? ` — ${fmtDate(t.departureDate)}` : ""}` }));

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 460, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}><span className="dot">✦</span> {org.name}</div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>Tell us about your payment</h1>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 16 }}>
          Pick your trip, enter your name (as given at booking) and the payment details. We’ll confirm it shortly.
        </p>
        {list.length === 0 ? (
          <div className="empty">No trips are open for payment right now. Please contact us.</div>
        ) : (
          <UniversalPayForm trips={list} />
        )}
      </div>
    </div>
  );
}
