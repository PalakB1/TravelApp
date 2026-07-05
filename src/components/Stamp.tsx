// Shows when a record was created, and — if it's since been changed — when it was
// last edited. Hover for the exact date/time. Drop this into any list or detail.
export default function Stamp({ created, updated, showEdited = true }: { created: Date; updated?: Date | null; showEdited?: boolean }) {
  const f = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const ft = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  const edited = updated ? updated.getTime() - created.getTime() > 60000 : false;
  return (
    <span className="muted small" title={`Created ${ft(created)}${edited && updated ? `\nLast edited ${ft(updated)}` : ""}`}>
      {f(created)}
      {showEdited && edited && updated ? <span style={{ color: "var(--text-3)" }}> · edited {f(updated)}</span> : null}
    </span>
  );
}
