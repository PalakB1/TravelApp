"use client";

import { useRef, useState, useEffect } from "react";

// Wraps any table and live-filters its <tbody> rows by free-text search and
// optional quick-filter chips. On phones it also caps the list to the first few
// rows with a "Show all" toggle (Paytm-style), so pages aren't a long scroll.
export default function TableSearch({
  placeholder = "Search…",
  tags = [],
  cap = 6,
  children,
}: {
  placeholder?: string;
  tags?: string[];
  cap?: number;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [shown, setShown] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function apply(query: string, t: string, mobile: boolean, exp: boolean) {
    const root = wrapRef.current;
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter((r) => !r.dataset.noFilter);
    const ql = query.trim().toLowerCase();
    const tl = t.trim().toLowerCase();
    let matched = 0;
    for (const r of rows) {
      const txt = (r.textContent || "").toLowerCase();
      const ok = (!ql || txt.includes(ql)) && (!tl || txt.includes(tl));
      if (!ok) { r.style.display = "none"; continue; }
      matched++;
      // On mobile, hide rows past the cap until "Show all" is tapped.
      r.style.display = mobile && !exp && matched > cap ? "none" : "";
    }
    setTotal(rows.length);
    setShown(matched);
    setMatchCount(matched);
  }

  // Track viewport so the cap only kicks in on phones.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Re-run whenever mobile/expanded changes (and on first mount).
  useEffect(() => {
    apply(q, tag, isMobile, expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, expanded]);

  return (
    <div>
      <div className="flex" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); apply(e.target.value, tag, isMobile, expanded); }}
          placeholder={`🔍  ${placeholder}`}
          style={{ maxWidth: 300 }}
        />
        {tags.length > 0 && (
          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
            <button type="button" className={`chip ${tag === "" ? "chip-on" : ""}`} onClick={() => { setTag(""); apply(q, "", isMobile, expanded); }}>All</button>
            {tags.map((t) => (
              <button type="button" key={t} className={`chip ${tag === t ? "chip-on" : ""}`} onClick={() => { setTag(t); apply(q, t, isMobile, expanded); }}>{t}</button>
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
      {isMobile && matchCount > cap && (
        <button type="button" className="btn sm showall-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${matchCount} →`}
        </button>
      )}
    </div>
  );
}
