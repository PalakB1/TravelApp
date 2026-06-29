import { formatINRShort } from "@/lib/money";

type Seg = { name: string; value: number; color: string };

// SVG donut chart with a center label and a legend.
export function Donut({ segments, centerTop, centerBottom, size = 150 }: { segments: Seg[]; centerTop?: string; centerBottom?: string; size?: number }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 13;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={15} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {total > 0 && segments.filter((s) => s.value > 0).map((seg, i) => {
            const dash = (seg.value / total) * circ;
            const el = (
              <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={seg.color} strokeWidth={15}
                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />
            );
            offset += dash;
            return el;
          })}
        </g>
        {centerTop && <text x={size / 2} y={size / 2 - 4} textAnchor="middle" style={{ fontSize: 19, fontWeight: 600, fill: "var(--text)" }}>{centerTop}</text>}
        {centerBottom && <text x={size / 2} y={size / 2 + 14} textAnchor="middle" style={{ fontSize: 11, fill: "var(--text-2)" }}>{centerBottom}</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-2)" }}>{s.name}</span>
            <span style={{ marginLeft: "auto", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatINRShort(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bars — good for labelled categories like trips.
export function HBars({ rows, max }: { rows: { label: string; value: number; sub?: string; color?: string }[]; max?: number }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div className="between" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatINRShort(r.value)}</span>
          </div>
          <div style={{ height: 9, background: "var(--surface-2)", borderRadius: 20, overflow: "hidden" }}>
            <div style={{ width: `${Math.max(2, (r.value / top) * 100)}%`, height: "100%", background: r.color || "var(--accent-grad)", borderRadius: 20 }} />
          </div>
          {r.sub && <div className="small muted" style={{ marginTop: 3 }}>{r.sub}</div>}
        </div>
      ))}
    </div>
  );
}
