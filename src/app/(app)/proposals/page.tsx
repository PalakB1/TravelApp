import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireScope } from "@/lib/scope";
import { formatINR } from "@/lib/money";
import { createProposal } from "./actions";
import TableSearch from "@/components/TableSearch";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");
const STATUS: Record<string, string> = { draft: "gray", sent: "accent", accepted: "green", declined: "red" };

export default async function ProposalsPage() {
  const scope = await requireScope();
  const proposals = await prisma.proposal.findMany({
    where: { orgId: scope.orgId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { days: true } } },
  });

  const sent = proposals.filter((p) => p.status === "sent").length;
  const accepted = proposals.filter((p) => p.status === "accepted").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Proposals</h1>
          <p className="sub">{proposals.length} proposal{proposals.length === 1 ? "" : "s"}{sent ? ` · ${sent} sent` : ""}{accepted ? ` · ${accepted} won` : ""}</p>
        </div>
        <form action={createProposal}>
          <button className="btn primary" type="submit">+ New proposal</button>
        </form>
      </div>

      {proposals.length === 0 ? (
        <div className="card">
          <div className="empty-cta">
            <span className="emoji">✨</span>
            <div className="t">Win your next customer</div>
            <div className="d">Build a beautiful day-by-day proposal with your pricing, then send it on WhatsApp. Start your first one.</div>
            <form action={createProposal}><button className="btn primary sm" type="submit">+ New proposal</button></form>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: "18px 20px" }}>
          <TableSearch placeholder="Search proposal, customer or destination…">
          <table className="t">
            <thead><tr><th>Proposal</th><th>Customer</th><th>Trip</th><th>Status</th><th className="num">Price</th><th></th></tr></thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="row-link" href={`/proposals/${p.id}`}>{p.title}</Link>
                    <div className="small muted">{p._count.days} day{p._count.days === 1 ? "" : "s"}{p.startDate ? ` · ${fmtDate(p.startDate)}` : ""}</div>
                  </td>
                  <td className="muted small">{p.customerName || "—"}</td>
                  <td className="muted small">{p.destination || "—"}</td>
                  <td><span className={`badge ${STATUS[p.status] || "gray"}`}>{p.status}</span></td>
                  <td className="num" style={{ fontWeight: 500 }}>{p.priceAmount > 0 ? <>{formatINR(p.priceAmount)}{p.pricePerPerson ? <span className="small muted"> /pp</span> : null}</> : <span className="muted">—</span>}</td>
                  <td className="num"><Link className="btn sm" href={`/proposal/${p.id}`} target="_blank" rel="noopener" title="Preview the customer view">Preview</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableSearch>
        </div>
      )}
    </>
  );
}
