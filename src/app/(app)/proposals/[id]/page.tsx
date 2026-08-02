import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import ShareProposal from "@/components/ShareProposal";
import { updateProposal, setProposalStatus, deleteProposal, addProposalDay, updateProposalDay, deleteProposalDay } from "../actions";

export const dynamic = "force-dynamic";

const toInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const STATUSES = ["draft", "sent", "accepted", "declined"];

export default async function ProposalBuilder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await requireScope();
  const p = await prisma.proposal.findFirst({
    where: { id, orgId: scope.orgId },
    include: { days: { orderBy: { order: "asc" } } },
  });
  if (!p) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 22 }}>{p.title}</h1>
          <p className="sub">
            <Link href="/proposals" style={{ color: "var(--accent)" }}>← All proposals</Link>
            {p.destination ? ` · ${p.destination}` : ""}{p.customerName ? ` · for ${p.customerName}` : ""}
          </p>
        </div>
        <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn sm" href={`/proposal/${p.id}`} target="_blank" rel="noopener">👁 Preview</Link>
          <ShareProposal proposalId={p.id} title={p.title} customerName={p.customerName} phone={p.customerPhone} />
        </div>
      </div>

      {/* Status pipeline */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="flex" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span className="small muted" style={{ marginRight: 4 }}>Stage:</span>
          {STATUSES.map((s) => (
            <form key={s} action={setProposalStatus}>
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="status" value={s} />
              <button className={`btn sm ${p.status === s ? "primary" : ""}`} type="submit">{s}</button>
            </form>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="card">
        <div className="card-title">Trip details</div>
        <form action={updateProposal}>
          <input type="hidden" name="id" value={p.id} />
          <div className="row-2">
            <label className="field"><span className="lbl">Proposal title</span><input name="title" defaultValue={p.title} placeholder="Bali Honeymoon Escape" /></label>
            <label className="field"><span className="lbl">Destination</span><input name="destination" defaultValue={p.destination || ""} placeholder="Bali, Indonesia" /></label>
          </div>
          <label className="field"><span className="lbl">One-line hook <span className="small muted">shown under the title</span></span><input name="heroNote" defaultValue={p.heroNote || ""} placeholder="5 nights of beaches, temples & sunsets — handcrafted for two" /></label>
          <div className="row-2">
            <label className="field"><span className="lbl">Customer name</span><input name="customerName" defaultValue={p.customerName || ""} placeholder="Riya & Arjun" /></label>
            <label className="field"><span className="lbl">Customer WhatsApp</span><input name="customerPhone" defaultValue={p.customerPhone || ""} placeholder="10-digit mobile" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Start date</span><input name="startDate" type="date" defaultValue={toInput(p.startDate)} /></label>
            <label className="field"><span className="lbl">Nights</span><input name="nights" type="number" min="0" defaultValue={p.nights || ""} placeholder="5" /></label>
            <label className="field"><span className="lbl">Travellers</span><input name="pax" type="number" min="1" defaultValue={p.pax || 1} /></label>
          </div>
          <div className="row-3" style={{ alignItems: "end" }}>
            <label className="field"><span className="lbl">Price</span><input name="priceAmount" defaultValue={p.priceAmount || ""} placeholder="85000 or 85k" /></label>
            <label className="field" style={{ justifyContent: "center" }}>
              <span className="flex" style={{ gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" name="pricePerPerson" defaultChecked={p.pricePerPerson} style={{ width: "auto" }} />
                <span className="lbl" style={{ margin: 0 }}>Price is per person</span>
              </span>
            </label>
            <div />
          </div>
          <div className="row-2">
            <label className="field"><span className="lbl">What&apos;s included <span className="small muted">one per line</span></span><textarea name="inclusions" rows={5} defaultValue={p.inclusions || ""} placeholder={"4-star hotel, 5 nights\nDaily breakfast\nAirport transfers\nAll sightseeing"} /></label>
            <label className="field"><span className="lbl">Not included <span className="small muted">one per line</span></span><textarea name="exclusions" rows={5} defaultValue={p.exclusions || ""} placeholder={"Flights\nVisa fee\nLunches & dinners\nPersonal expenses"} /></label>
          </div>
          <label className="field"><span className="lbl">Payment &amp; cancellation terms</span><textarea name="terms" rows={3} defaultValue={p.terms || ""} placeholder="30% to confirm, balance 15 days before travel. Free cancellation up to 30 days before departure." /></label>
          <button className="primary" type="submit">Save details</button>
        </form>
      </div>

      {/* Day-by-day itinerary */}
      <div className="card">
        <div className="card-title">Day-by-day itinerary <span className="small muted">this is the heart of the proposal</span></div>
        {p.days.length === 0 ? (
          <div className="empty" style={{ padding: "12px 8px" }}>No days yet — add Day 1 below.</div>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {p.days.map((d, i) => (
              <div key={d.id} className="form-box">
                <form action={updateProposalDay}>
                  <input type="hidden" name="id" value={d.id} />
                  <div className="flex" style={{ gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span className="badge accent" style={{ flexShrink: 0 }}>Day {i + 1}</span>
                    <input name="title" defaultValue={d.title} placeholder="Arrival & beach sunset" style={{ fontWeight: 500 }} />
                  </div>
                  <textarea name="description" rows={2} defaultValue={d.description || ""} placeholder="What the day holds — sights, meals, experiences…" />
                  <div className="flex" style={{ gap: 8, marginTop: 8 }}>
                    <button className="sm primary" type="submit">Save day</button>
                  </div>
                </form>
                <form action={deleteProposalDay} style={{ marginTop: 6 }}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="sm" type="submit">Delete Day {i + 1}</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <details className="add" open={p.days.length === 0}>
          <summary>+ Add a day</summary>
          <div className="form-box">
            <form action={addProposalDay}>
              <input type="hidden" name="proposalId" value={p.id} />
              <label className="field"><span className="lbl">Day title</span><input name="title" placeholder="Arrival in Bali" /></label>
              <label className="field"><span className="lbl">What happens</span><textarea name="description" rows={2} placeholder="Airport pickup, check in, evening at Seminyak beach." /></label>
              <button className="primary sm" type="submit">Add day</button>
            </form>
          </div>
        </details>
      </div>

      <div className="card">
        <details>
          <summary style={{ color: "var(--danger)", cursor: "pointer" }}>Delete this proposal</summary>
          <form action={deleteProposal} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={p.id} />
            <button className="sm" type="submit">Delete permanently</button>
          </form>
        </details>
      </div>
    </>
  );
}
