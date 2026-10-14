import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import VisaTripFilter from "@/components/VisaTripFilter";
import VisaLinkBuilder from "@/components/VisaLinkBuilder";
import AgencyVisaLink from "@/components/AgencyVisaLink";
import { visaLabel, visaFlags } from "@/lib/visa";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
}
function fmtDT(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "—";
}
const STATUS: Record<string, string> = { collecting: "gray", ready: "sky", appointment: "amber", submitted: "violet", approved: "green", rejected: "red" };

export default async function VisasPage({ searchParams }: { searchParams: Promise<{ trip?: string }> }) {
  const { trip: tripId } = await searchParams;
  const scope = await requireScope();
  const cutoff = new Date(Date.now() - 864e5);
  const org = await prisma.organization.findUnique({ where: { id: scope.orgId }, select: { name: true } });

  // Build the agency's link here rather than in the browser, so it is whole in
  // the first paint. Behind Vercel the forwarded proto is the real one.
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "tripzei.com"}`;

  const trips = await prisma.trip.findMany({
    where: { ...scope.tripWhere, OR: [{ departureDate: null }, { departureDate: { gte: cutoff } }] },
    orderBy: [{ departureDate: "asc" }],
    select: { id: true, name: true },
  });
  const selectedTrip = tripId ? trips.find((t) => t.id === tripId) || (await prisma.trip.findFirst({ where: { AND: [{ id: tripId }, scope.tripWhere] }, select: { id: true, name: true } })) : null;

  // A form can arrive against a trip, or through the agency's permanent link with
  // no trip at all — so the desk is scoped by ORG, not through a trip. The one
  // exception is a member limited to certain trips: they keep seeing only those
  // trips' forms, and enquiries that belong to no trip stay out of their view.
  const where = tripId
    ? { tripId, ...scope.viaTrip }
    : scope.tripIds
      ? scope.viaTrip
      : { orgId: scope.orgId };

  const applicants = await prisma.visaApplicant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    // the trip's dates come along because the paperwork checks need them —
    // a passport is only "expiring too soon" relative to a return date
    include: { trip: { select: { name: true, departureDate: true, endDate: true } } },
  });

  // Run each applicant's answers through the same checks the detail page shows,
  // so the desk itself says which files have a problem rather than hiding it one
  // click deeper.
  const flagged = new Map(applicants.map((a) => [a.id, visaFlags(a, a.trip)]));
  const needWork = applicants.filter((a) => (flagged.get(a.id) ?? []).some((f) => f.level === "stop")).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Visa desk</h1>
          <p className="sub">
            {applicants.length} visa form{applicants.length === 1 ? "" : "s"}{selectedTrip ? ` for ${selectedTrip.name}` : " — trips and direct enquiries"}
            {needWork > 0 ? <> · <span style={{ color: "var(--danger)", fontWeight: 600 }}>{needWork} {needWork === 1 ? "needs" : "need"} fixing before submission</span></> : null}
          </p>
        </div>
      </div>

      <AgencyVisaLink orgId={scope.orgId} agencyName={org?.name ?? "Your travel desk"} origin={origin} />

      <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
        <div className="card-title">Or a link for one trip <span className="small muted">same form, but tied to a trip so its dates and hotels go into the cover letter</span></div>
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
          <TableSearch placeholder="Search traveller or trip…">
          <table className="t">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Applicant</th><th>Applying to</th><th>Trip</th><th>Paperwork</th><th>Submitted</th><th>Appointment</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <tr key={a.id}>
                  <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/visas/${a.id}`}>{a.fullName}</Link></td>
                  <td><span className="badge accent">{visaLabel(a)}</span></td>
                  <td className="muted small">{a.trip ? a.trip.name : <span className="badge gray">enquiry</span>}</td>
                  <td>{(() => {
                    const f = flagged.get(a.id) ?? [];
                    const stop = f.filter((x) => x.level === "stop").length;
                    const check = f.length - stop;
                    if (stop) return <span className="badge red">{stop} to fix</span>;
                    if (check) return <span className="badge amber">{check} to check</span>;
                    return <span className="badge green">consistent</span>;
                  })()}</td>
                  <td className="muted small">{fmt(a.createdAt)}</td>
                  <td className="muted small">{fmtDT(a.appointmentAt)}</td>
                  <td><span className={`badge ${STATUS[a.status] || "gray"}`}>{a.status}</span></td>
                  <td className="num"><Link className="btn sm" href={`/visas/${a.id}`}>Open →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        )}
      </div>
    </>
  );
}
