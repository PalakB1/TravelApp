import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingBalance, isActive } from "@/lib/calc";
import UniversalPayForm from "./UniversalPayForm";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

// PUBLIC universal payment link for one agency: the payer picks their trip and
// their name from dropdowns, then reports the payment (lands as pending).
export default async function OrgPayPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const org = await prisma.organization.findFirst({ where: { id: orgId, status: "approved" }, select: { id: true, name: true } });
  if (!org) notFound();

  const trips = await prisma.trip.findMany({
    where: { orgId },
    orderBy: [{ departureDate: "desc" }],
    include: { bookings: { include: { variant: true, payments: true } } },
  });

  const data = trips
    .map((t) => ({
      id: t.id,
      name: `${t.name}${t.departureDate ? ` — ${fmtDate(t.departureDate)}` : ""}`,
      people: t.bookings
        .filter((b) => isActive(b.status))
        .map((b) => ({ id: b.id, name: b.customerName, balance: bookingBalance(b) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((t) => t.people.length > 0);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 460, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0, marginBottom: 4 }}><span className="dot">✦</span> {org.name}</div>
        <h1 style={{ fontSize: 20, marginTop: 6 }}>Tell us about your payment</h1>
        <p className="muted small" style={{ marginTop: 4, marginBottom: 16 }}>
          Pick your trip and your name, then share the payment details. We’ll confirm it shortly.
        </p>
        {data.length === 0 ? (
          <div className="empty">No trips are open for payment right now. Please contact us.</div>
        ) : (
          <UniversalPayForm trips={data} />
        )}
      </div>
    </div>
  );
}
