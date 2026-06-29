import Link from "next/link";
import { prisma } from "@/lib/db";

function fmtWhen(d: Date) {
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}
const ACTION_BADGE: Record<string, string> = { added: "green", updated: "amber", deleted: "red", status: "violet" };

type Log = { id: string; createdAt: Date; action: string; summary: string; href: string | null };

// A per-category history feed. Best-effort: if the table doesn't exist yet
// (before the migration deploys), it renders empty instead of crashing.
export default async function ActivityLog({ category, title = "Activity log", limit = 40 }: { category: string | string[]; title?: string; limit?: number }) {
  let logs: Log[] = [];
  try {
    logs = await prisma.activityLog.findMany({
      where: { category: Array.isArray(category) ? { in: category } : category },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    logs = [];
  }

  return (
    <details className="card">
      <summary style={{ listStyle: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span>🕑 {title}</span>
        <span className="small muted">{logs.length} recent ▾</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        {logs.length === 0 ? (
          <div className="empty small">No activity recorded yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {logs.map((l) => {
              const row = (
                <div className="between" style={{ padding: "8px 10px" }}>
                  <span style={{ fontSize: 13.5 }}>
                    <span className={`badge ${ACTION_BADGE[l.action] || "gray"}`} style={{ marginRight: 8 }}>{l.action}</span>
                    {l.summary}
                  </span>
                  <span className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtWhen(l.createdAt)}</span>
                </div>
              );
              return l.href ? <Link key={l.id} href={l.href} className="log-row">{row}</Link> : <div key={l.id} className="log-row">{row}</div>;
            })}
          </div>
        )}
      </div>
    </details>
  );
}
