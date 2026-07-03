import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { visaCoverLetter, visaChecklist } from "@/lib/visa";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const today = () => new Date("2026-06-30").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function VisaResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.visaApplicant.findUnique({
    where: { id },
    include: { trip: { include: { itinerary: { orderBy: { order: "asc" }, include: { hotels: true } } } } },
  });
  if (!a) notFound();

  const letter = visaCoverLetter(a, a.trip);
  const checklist = visaChecklist(a);

  return (
    <div style={{ minHeight: "100vh", padding: "24px 16px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: 780, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="brand" style={{ paddingLeft: 0 }}><span className="dot">✦</span> Trip Desk</div>
            <p className="small muted" style={{ margin: "4px 0 0" }}>Cover letter & checklist for <b>{a.fullName}</b>. Review, then print or save as PDF.</p>
          </div>
          <PrintButton />
        </div>

        {/* COVER LETTER */}
        <div className="card sheet">
          <div style={{ textAlign: "right", marginBottom: 18 }}>{today()}</div>
          <div style={{ marginBottom: 14 }}>{letter.salutation}</div>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Subject: {letter.subject}</div>
          <p style={{ marginBottom: 14 }}>Dear Sir / Madam,</p>
          {letter.paragraphs.map((p, i) => <p key={i} style={{ marginBottom: 12, lineHeight: 1.7, textAlign: "justify" }}>{p}</p>)}

          <div style={{ fontWeight: 600, margin: "14px 0 8px" }}>Itinerary & accommodation</div>
          <table className="t" style={{ fontSize: 13 }}>
            <thead><tr><th>Day</th><th>Date</th><th>Location</th><th>Hotel</th></tr></thead>
            <tbody>
              {letter.itinerary.length === 0 ? <tr><td colSpan={4} className="muted">Itinerary to be attached.</td></tr> :
                letter.itinerary.map((r) => <tr key={r.day}><td>Day {r.day}</td><td>{r.date}</td><td>{r.location}</td><td>{r.hotel}</td></tr>)}
            </tbody>
          </table>

          <div style={{ marginTop: 22 }}>Yours sincerely,</div>
          <div style={{ fontWeight: 600, marginTop: 18 }}>{letter.sign.name}</div>
          {letter.sign.contact ? <div className="small muted">{letter.sign.contact}</div> : null}
        </div>

        {/* CHECKLIST */}
        <div className="card sheet" style={{ marginTop: 16, pageBreakBefore: "always" }}>
          <h2 style={{ fontSize: 17, marginBottom: 4 }}>Documents to submit — {a.fullName}</h2>
          <p className="small muted" style={{ marginBottom: 14 }}>Bring the originals + one photocopy of each to your VFS appointment. Biometrics (fingerprints + photo) are given in person.</p>
          {checklist.map((g) => (
            <div key={g.title} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((it, i) => (
                  <div key={i} className="flex" style={{ alignItems: "flex-start", gap: 10 }}>
                    <span style={{ width: 16, height: 16, border: "1.5px solid var(--border-strong)", borderRadius: 4, flexShrink: 0, marginTop: 2 }} />
                    <div><span style={{ fontSize: 14 }}>{it.label}</span>{it.note ? <div className="small muted">{it.note}</div> : null}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
