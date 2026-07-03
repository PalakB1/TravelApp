import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { visaChecklist } from "@/lib/visa";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function VisaChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await prisma.visaApplicant.findUnique({
    where: { id },
    include: { trip: { select: { name: true } } },
  });
  if (!a) notFound();
  const checklist = visaChecklist(a);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "start center", padding: "24px 16px" }}>
      <div style={{ width: 640, maxWidth: "100%" }}>
        <div className="between no-print" style={{ marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="brand" style={{ paddingLeft: 0 }}><span className="dot">✦</span> Trip Desk</div>
          <PrintButton />
        </div>

        <div className="empty-cta no-print" style={{ borderColor: "var(--success)", marginBottom: 16 }}>
          <span className="emoji">✅</span>
          <div className="t">Thank you, {a.fullName.split(" ")[0]}!</div>
          <div className="d">Your details are submitted to our team. Below is the list of documents you’ll need for your {a.trip.name} Schengen visa — please start gathering these. Print or save this page.</div>
        </div>

        <div className="card sheet">
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Documents to prepare — {a.fullName}</h2>
          <p className="small muted" style={{ marginBottom: 16 }}>Bring the originals + one photocopy of each to your VFS appointment. Biometrics (fingerprints + photo) are given in person at the centre. We’ll share your cover letter separately.</p>
          {checklist.map((g) => (
            <div key={g.title} style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
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
