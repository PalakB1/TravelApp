"use client";

import { useRef, useState, useEffect } from "react";

// Wraps any table and live-filters its <tbody> rows by free-text search and
// optional quick-filter chips. Works on server-rendered tables — no data wiring.
export default function TableSearch({
  placeholder = "Search…",
  tags = [],
  children,
}: {
  placeholder?: string;
  tags?: string[];
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  function apply(query: string, t: string) {
    const root = wrapRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter((r) => !r.dataset.noFilter);
    const ql = query.trim().toLowerCase();
    const tl = t.trim().toLowerCase();
    let count = 0;
    for (const r of rows) {
      const txt = (r.textContent || "").toLowerCase();
      const ok = (!ql || txt.includes(ql)) && (!tl || txt.includes(tl));
      r.style.display = ok ? "" : "none";
      if (ok) count++;
    }
    setTotal(rows.length);
    setShown(count);
  }

  useEffect(() => {
    apply(q, tag);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); apply(e.target.value, tag); }}
          placeholder={`🔍  ${placeholder}`}
          style={{ maxWidth: 300 }}
        />
        {tags.length > 0 && (
          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
            <button type="button" className={`chip ${tag === "" ? "chip-on" : ""}`} onClick={() => { setTag(""); apply(q, ""); }}>All</button>
            {tags.map((t) => (
              <button type="button" key={t} className={`chip ${tag === t ? "chip-on" : ""}`} onClick={() => { setTag(t); apply(q, t); }}>{t}</button>
            ))}
          </div>
        )}
        {shown !== null && (q || tag) && (
          <span className="small muted" style={{ marginLeft: "auto" }}>{shown} of {total}</span>
        )}
      </div>
      <div ref={wrapRef}>{children}</div>
      {shown === 0 && (q || tag) && (
        <div className="empty">No matches for “{q || tag}”. Try a different search.</div>
      )}
    </div>
  );
}
