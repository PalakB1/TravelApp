import Link from "next/link";
import { prisma } from "@/lib/db";
import VisaTripFilter from "@/components/VisaTripFilter";
import CopyLink from "@/components/CopyLink";

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
  const cutoff = new Date(Date.now() - 864e5);

  const trips = await prisma.trip.findMany({
    where: { OR: [{ departureDate: null }, { departureDate: { gte: cutoff } }] },
    orderBy: [{ departureDate: "asc" }],
    select: { id: true, name: true },
  });
  const selectedTrip = tripId ? trips.find((t) => t.id === tripId) || (await prisma.trip.findUnique({ where: { id: tripId }, select: { id: true, name: true } })) : null;

  const applicants = await prisma.visaApplicant.findMany({
    where: tripId ? { tripId } : {},
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
        <VisaTripFilter trips={trips} selected={tripId || ""} />
      </div>

      {selectedTrip && (
        <div className="card">
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>🔗 Share this visa form with every traveller on {selectedTrip.name}</div>
          <CopyLink path={`/visa/${selectedTrip.id}`} label="Copy link" waText={`Please fill your visa details for ${selectedTrip.name} here:`} />
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {applicants.length === 0 ? (
          <div className="empty">No visa forms filled yet. Share the form link with your travellers.</div>
        ) : (
          <table className="t">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Applicant</th><th>Trip</th><th>Submitted</th><th>Appointment</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <tr key={a.id}>
                  <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/visas/${a.id}`}>{a.fullName}</Link></td>
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
