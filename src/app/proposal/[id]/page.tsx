import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null);
const lines = (s: string | null) => (s || "").split("\n").map((x) => x.trim()).filter(Boolean);

// PUBLIC — the branded proposal a prospective customer opens from WhatsApp.
export default async function PublicProposal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.proposal.findUnique({
    where: { id },
    include: { org: true, days: { orderBy: { order: "asc" } } },
  });
  if (!p) notFound();

  const org = p.org;
  const agency = org?.legalName || org?.name || "Trip Desk";
  const incl = lines(p.inclusions);
  const excl = lines(p.exclusions);
  const price = p.priceAmount > 0 ? formatINR(p.priceAmount) : null;
  const meta = [
    p.destination && `📍 ${p.destination}`,
    fmt(p.startDate) && `📅 ${fmt(p.startDate)}`,
    p.nights > 0 && `🌙 ${p.nights} night${p.nights === 1 ? "" : "s"}`,
    p.pax > 0 && `👥 ${p.pax} traveller${p.pax === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];

  return (
    <div className="doc-light" style={{ minHeight: "100vh", padding: "24px 16px", display: "grid", placeItems: "start center" }}>
      <div style={{ width: 640, maxWidth: "100%" }}>
        {/* toolbar (hidden in print) */}
        <div className="between no-print" style={{ marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div className="flex" style={{ gap: 10, alignItems: "center" }}>
            {org?.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org.logo} alt="" style={{ height: 34, maxWidth: 130, objectFit: "contain" }} />
            ) : null}
            <span style={{ fontWeight: 600 }}>{agency}</span>
          </div>
          <PrintButton />
        </div>

        {/* HERO */}
        <div style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 44px rgba(27,28,43,0.14)" }}>
          <div style={{ background: "linear-gradient(135deg, #7b6ff2 0%, #5b50e6 100%)", color: "#fff", padding: "34px 32px" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.85, marginBottom: 8 }}>Travel proposal</div>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" }}>{p.title}</div>
            {p.heroNote && <div style={{ marginTop: 10, fontSize: 15, opacity: 0.92, maxWidth: 480 }}>{p.heroNote}</div>}
            {meta.length > 0 && (
              <div className="flex" style={{ gap: 14, flexWrap: "wrap", marginTop: 18, fontSize: 13.5 }}>
                {meta.map((m) => <span key={m}>{m}</span>)}
              </div>
            )}
          </div>

          {/* PRICE band */}
          {price && (
            <div className="between" style={{ background: "#fff", padding: "16px 32px", borderBottom: "1px solid #ecebf5", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div className="small muted" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>Your price</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{price} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-2)" }}>{p.pricePerPerson ? "per person" : "total"}</span></div>
              </div>
              {p.customerName && <div className="small muted" style={{ textAlign: "right" }}>Prepared for<br /><b style={{ color: "var(--text)", fontSize: 14 }}>{p.customerName}</b></div>}
            </div>
          )}
        </div>

        {/* DAY BY DAY */}
        {p.days.length > 0 && (
          <div className="sheet" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Your journey, day by day</div>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 0 }}>
              {p.days.map((d, i) => (
                <div key={d.id} style={{ display: "flex", gap: 14, paddingBottom: 18 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--accent-bg)", color: "var(--accent)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                    {i < p.days.length - 1 && <div style={{ width: 2, flex: 1, background: "var(--border)", marginTop: 4 }} />}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <div style={{ fontWeight: 600 }}>Day {i + 1}{d.title ? ` — ${d.title}` : ""}</div>
                    {d.description && <div className="small" style={{ color: "var(--text-2)", marginTop: 4, whiteSpace: "pre-wrap" }}>{d.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INCLUSIONS / EXCLUSIONS */}
        {(incl.length > 0 || excl.length > 0) && (
          <div className="sheet" style={{ marginTop: 16 }}>
            <div className="row-2" style={{ gap: 24 }}>
              {incl.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>What&apos;s included</div>
                  {incl.map((x, i) => <div key={i} className="flex" style={{ gap: 8, marginBottom: 7, alignItems: "flex-start" }}><span style={{ color: "var(--success)", fontWeight: 700 }}>✓</span><span style={{ fontSize: 14 }}>{x}</span></div>)}
                </div>
              )}
              {excl.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10 }}>Not included</div>
                  {excl.map((x, i) => <div key={i} className="flex" style={{ gap: 8, marginBottom: 7, alignItems: "flex-start" }}><span style={{ color: "var(--text-3)", fontWeight: 700 }}>✗</span><span style={{ fontSize: 14, color: "var(--text-2)" }}>{x}</span></div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TERMS */}
        {p.terms && (
          <div className="sheet" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Payment &amp; cancellation</div>
            <div className="small" style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{p.terms}</div>
          </div>
        )}

        {/* CTA */}
        <div className="sheet no-print" style={{ marginTop: 16, textAlign: "center", background: "var(--accent-bg)", border: "none" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Love it? Let&apos;s make it real. ✨</div>
          <div className="small" style={{ color: "var(--text-2)", marginTop: 6 }}>Just reply on WhatsApp to confirm your dates — we&apos;ll take care of the rest.</div>
        </div>

        <div className="small muted" style={{ textAlign: "center", margin: "18px 0 8px" }}>Proposal by {agency}{org?.gstin ? ` · GSTIN ${org.gstin}` : ""}</div>
      </div>
    </div>
  );
}
