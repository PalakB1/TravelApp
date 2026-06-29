"use client";

import { useState, useRef, useEffect } from "react";

export type ComboOption = { id: string; label: string; sub?: string };

// A modern type-to-search picker. You type, it filters an existing list and you
// pick one — it never creates a new entry. Submits the chosen id via a hidden input.
export default function Combobox({
  name,
  options,
  placeholder = "Type to search…",
  emptyHint = "No match found.",
}: {
  name: string;
  options: ComboOption[];
  placeholder?: string;
  emptyHint?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [selId, setSelId] = useState("");
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const ql = q.trim().toLowerCase();
  const filtered = ql ? options.filter((o) => (o.label + " " + (o.sub || "")).toLowerCase().includes(ql)) : options;
  const shown = filtered.slice(0, 60);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(o: ComboOption) {
    setSelId(o.id);
    setQ(o.label);
    setOpen(false);
  }

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input type="hidden" name={name} value={selId} />
      <input
        value={q}
        role="combobox"
        aria-expanded={open}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => { setQ(e.target.value); setSelId(""); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { if (open && shown[active]) { e.preventDefault(); choose(shown[active]); } }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        style={selId ? { borderColor: "var(--success)" } : undefined}
      />
      {selId && <span style={{ position: "absolute", right: 11, top: 10, color: "var(--success)", fontSize: 14 }}>✓</span>}
      {open && (
        <div className="cbx-list">
          {shown.length > 0 ? shown.map((o, i) => (
            <div
              key={o.id}
              className={`cbx-item ${i === active ? "on" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              onMouseEnter={() => setActive(i)}
            >
              <div className="cbx-label">{o.label}</div>
              {o.sub && <div className="cbx-sub">{o.sub}</div>}
            </div>
          )) : (
            <div className="cbx-empty">{emptyHint}</div>
          )}
        </div>
      )}
    </div>
  );
}
