import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import VisaTripFilter from "@/components/VisaTripFilter";
import VisaLinkBuilder from "@/components/VisaLinkBuilder";
import { visaLabel } from "@/lib/visa";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
}
function fmtDT(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "—";
}
const STATUS: Record<string, string> = { collecting: "gray", ready: "sky", appointment: "amber", submitted: "violet", approved: "green", rejected: "red" };

export default async function VisasPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const { trip: tripId } = await searchParams;
  const scope = await requireScope();
  const cutoff = new Date(Date.now() - 864e5);

  const trips = await prisma.trip.findMany({
    where: { ...scope.tripWhere, OR: [{ departureDate: null }, { departureDate: { gte: cutoff } }] },
    orderBy: [{ departureDate: "asc" }],
    select: { id: true, name: true },
  });
  const selectedTrip = tripId ? trips.find((t) => t.id === tripId) || (await prisma.trip.findFirst({ where: { AND: [{ id: tripId }, scope.tripWhere] }, select: { id: true, name: true } })) : null;

  const applicants = await prisma.visaApplicant.findMany({
    where: tripId ? { tripId, ...scope.viaTrip } : scope.viaTrip,
    orderBy: { createdAt: "desc" },
    include: { trip: { select: { name: true } } },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Visa desk</h1>
          <p className="sub">{applicants.length} visa form{applicants.length === 1 ? "" : "s"}{selectedTrip ? ` for ${selectedTrip.name}` : " across upcoming trips"}</p>
        </div>
      </div>

      <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
        <div className="card-title">🔗 Visa form link <span className="small muted">pick a trip &amp; visa type, then share the link with its travellers</span></div>
        <div style={{ display: "grid", gap: 12 }}>
          <VisaTripFilter trips={trips} selected={tripId || ""} />
          {selectedTrip
            ? <VisaLinkBuilder tripId={selectedTrip.id} tripName={selectedTrip.name} />
            : <span className="small muted">Choose a trip above to get its form link.</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {applicants.length === 0 ? (
          <div className="empty">No visa forms filled yet. Share the form link with your travellers.</div>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Applicant</th><th>Visa</th><th>Trip</th><th>Submitted</th><th>Appointment</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <tr key={a.id}>
                  <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/visas/${a.id}`}>{a.fullName}</Link></td>
                  <td><span className="badge accent">{visaLabel(a)}</span></td>
                  <td className="muted small">{a.trip.name}</td>
                  <td className="muted small">{fmt(a.createdAt)}</td>
                  <td className="muted small">{fmtDT(a.appointmentAt)}</td>
                  <td><span className={`badge ${STATUS[a.status] || "gray"}`}>{a.status}</span></td>
                  <td className="num"><Link className="btn sm" href={`/visas/${a.id}`}>Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
