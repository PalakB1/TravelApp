import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatINRShort } from "@/lib/money";
import { customOrgId, ctRevenue, ctOutstanding, ctCost, ctProfit } from "./lib";
import { createCustomTrip } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { enquiry: "gray", confirmed: "sky", travelled: "green", cancelled: "rose" };
function fmt(d: Date | null) {
  return d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
}

export default async function CustomTripsPage() {
  const orgId = await customOrgId();
  if (!orgId) notFound();

  const trips = await prisma.customTrip.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { qty: true, cost: true, sell: true, taxable: true } }, payments: { select: { amount: true } } },
  });
  const customers = await prisma.customer.findMany({ where: { orgId }, select: { name: true }, orderBy: { name: "asc" } });

  const live = trips.filter((t) => t.status !== "cancelled");
  const totRev = live.reduce((s, t) => s + ctRevenue(t), 0);
  const totCost = live.reduce((s, t) => s + ctCost(t), 0);
  const totProfit = live.reduce((s, t) => s + ctProfit(t), 0);
  const totOut = live.reduce((s, t) => s + ctOutstanding(t), 0);
  const margin = totRev > 0 ? Math.round((totProfit / totRev) * 100) : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Custom trips</h1>
          <p className="sub">{trips.length} bespoke itiner{trips.length === 1 ? "y" : "ies"} · book flights, hotels or anything, per client</p>
        </div>
      </div>

      <div className="metrics">
        <div className="metric c-emerald"><div className="label">Revenue</div><div className="value">{formatINRShort(totRev)}</div><div className="foot">across {live.length} trip{live.length === 1 ? "" : "s"}</div></div>
        <div className="metric c-amber"><div className="label">Your cost</div><div className="value">{formatINRShort(totCost)}</div><div className="foot">all line items</div></div>
        <div className="metric c-violet"><div className="label">Profit</div><div className="value">{formatINRShort(totProfit)}</div><div className="foot">{margin}% margin</div></div>
        <div className={`metric ${totOut > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Outstanding</div><div className="value">{formatINRShort(totOut)}</div><div className="foot">due from clients</div></div>
      </div>

      <div className="card" style={{ background: "var(--accent-bg)", borderColor: "transparent" }}>
        <div className="card-title">✦ New custom trip</div>
        <form action={createCustomTrip}>
          <div className="row-3">
            <label className="field"><span className="lbl">Client name</span>
              <input name="clientName" list="ct-customers" placeholder="Who is this for?" required />
              <datalist id="ct-customers">{customers.map((c) => <option key={c.name} value={c.name} />)}</datalist>
            </label>
            <label className="field"><span className="lbl">Trip title</span><input name="title" placeholder="e.g. Paris honeymoon, Dubai 4N" /></label>
            <label className="field"><span className="lbl">Phone (optional)</span><input name="clientPhone" placeholder="for new clients" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Start date</span><input name="startDate" type="date" /></label>
            <label className="field"><span className="lbl">End date</span><input name="endDate" type="date" /></label>
            <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
              <button className="primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>Create →</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {trips.length === 0 ? (
          <div className="empty">No custom trips yet. Create one above — then add flights, hotels, transfers or anything you’re booking.</div>
        ) : (
          <table className="t">
            <thead><tr><th style={{ paddingLeft: 20 }}>Client</th><th>Trip</th><th>Dates</th><th>Status</th><th className="num">Revenue</th><th className="num">Outstanding</th><th></th></tr></thead>
            <tbody>
              {trips.map((t) => {
                const rev = ctRevenue(t);
                const out = ctOutstanding(t);
                return (
                  <tr key={t.id}>
                    <td style={{ paddingLeft: 20 }}><Link className="row-link" href={`/custom-trips/${t.id}`}>{t.clientName}</Link></td>
                    <td className="muted small">{t.title}</td>
                    <td className="muted small">{fmt(t.startDate)}{t.endDate ? ` – ${fmt(t.endDate)}` : ""}</td>
                    <td><span className={`badge ${STATUS[t.status] || "gray"}`}>{t.status}</span></td>
                    <td className="num">{formatINRShort(rev)}</td>
                    <td className="num">{out > 0 ? <span className="badge amber">{formatINRShort(out)}</span> : <span className="badge green">clear</span>}</td>
                    <td className="num"><Link className="btn sm" href={`/custom-trips/${t.id}`}>Open →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
