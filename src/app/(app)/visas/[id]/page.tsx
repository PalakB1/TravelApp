import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { visaCoverLetter, visaChecklist, visaLabel } from "@/lib/visa";
import { updateVisaApplicant, deleteVisaApplicant } from "../../data-actions";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
}
function dateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 16) : "";
}
const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <div className="small muted">{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{value && String(value).trim() ? value : <span className="muted" style={{ fontWeight: 400 }}>—</span>}</div>
    </div>
  );
}

export default async function VisaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await requireScope();
  const a = await prisma.visaApplicant.findFirst({
    where: { id, ...scope.viaTrip },
    include: { trip: { include: { itinerary: { orderBy: { order: "asc" }, include: { hotels: true } } } } },
  });
  if (!a) notFound();

  const letter = visaCoverLetter(a, a.trip);
  const checklist = visaChecklist(a);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <div className="small muted"><Link href="/visas" style={{ color: "var(--text-2)" }}>← Visa desk</Link></div>
          <h1 style={{ marginTop: 6 }}>{a.fullName} <span className="badge accent" style={{ verticalAlign: "middle" }}>{visaLabel(a)}</span></h1>
          <p className="sub">Visa application · {a.trip.name}</p>
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <PrintButton />
          <details className="menu-pop" style={{ position: "relative" }}>
            <summary className="btn sm" style={{ listStyle: "none", cursor: "pointer", color: "var(--danger)", borderColor: "var(--danger-bg)" }}>Delete</summary>
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 240, zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 14 }}>
              <p className="small muted" style={{ margin: "0 0 10px" }}>Delete this visa form permanently?</p>
              <form action={deleteVisaApplicant}><input type="hidden" name="id" value={a.id} /><button className="danger sm" type="submit">Yes, delete</button></form>
            </div>
          </details>
        </div>
      </div>

      {/* STATUS + APPOINTMENT */}
      <div className="card no-print">
        <div className="card-title">Status & appointment</div>
        <form action={updateVisaApplicant} className="row-3">
          <input type="hidden" name="id" value={a.id} />
          <label className="field"><span className="lbl">Status</span>
            <select name="status" defaultValue={a.status}>
              <option value="collecting">Collecting documents</option>
              <option value="ready">Ready to submit</option>
              <option value="appointment">Appointment booked</option>
              <option value="submitted">Submitted at VFS</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="field"><span className="lbl">VFS appointment date & time</span><input name="appointmentAt" type="datetime-local" defaultValue={dateInput(a.appointmentAt)} /></label>
          <div className="flex" style={{ alignItems: "flex-end", paddingBottom: 12 }}><button className="primary sm" type="submit">Save</button></div>
        </form>
        <p className="small muted" style={{ margin: 0 }}>Form submitted {fmt(a.createdAt)}.</p>
      </div>

      {/* ALL DETAILS — to transcribe into the Schengen application form */}
      <div className="card no-print">
        <div className="card-title">All details <span className="small muted">everything the applicant entered — for filling the visa form</span></div>
        <div className="grid-2">
          <div>
            <Field label="Full name (passport)" value={a.fullName} />
            <Field label="Date of birth" value={fmt(a.dob)} />
            <Field label="Place of birth" value={a.placeOfBirth} />
            <Field label="Nationality" value={a.nationality} />
            <Field label="Marital status" value={a.maritalStatus} />
            <Field label="Passport number" value={a.passportNo} />
            <Field label="Passport issued" value={`${fmt(a.passportIssue)}${a.passportPlace ? ` at ${a.passportPlace}` : ""}`} />
            <Field label="Passport expiry" value={fmt(a.passportExpiry)} />
            <Field label="Address" value={[a.address, a.city, a.pin].filter(Boolean).join(", ")} />
            <Field label="Phone" value={a.phone} />
            <Field label="Email" value={a.email} />
          </div>
          <div>
            <Field label="I am" value={a.employmentType} />
            <Field label="Occupation" value={a.occupation} />
            <Field label="Employer / business" value={a.employer} />
            <Field label="GST no." value={a.gstNo} />
            <Field label="Employer / business address" value={a.employerAddress} />
            <Field label="Income" value={a.income} />
            <Field label="Who is paying" value={a.funding === "sponsor" ? `Sponsor: ${a.sponsorName || "—"}${a.sponsorRelation ? ` (${a.sponsorRelation})` : ""}` : "Self"} />
            <Field label="Travelling with" value={a.travellingWith} />
            <Field label="Previous Schengen visas" value={a.prevSchengen} />
            <Field label="Wants long-term (multi-entry)" value={a.wantsLongTerm ? "Yes — insurance for 1 year" : "No"} />
            <Field label="Past international travel" value={a.travelHistory} />
            <Field label="Dependants staying in India" value={a.dependents} />
            <Field label="Investments & assets" value={a.investments} />
            <Field label="Notes" value={a.notes} />
          </div>
        </div>
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
        <p className="small muted" style={{ marginBottom: 14 }}>Bring originals + one photocopy of each to the VFS appointment. Biometrics are given in person.</p>
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
    </>
  );
}
