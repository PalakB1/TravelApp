"use client";

import { useMemo, useState } from "react";
import { settleExpenses } from "@/app/(app)/expenses/actions";

export type PersonalRow = {
  id: string;
  date: string;
  payee: string;
  category: string;
  trip: string;
  bankName: string;
  notes: string;
  amount: number;
};

const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

// One person's unsettled personal spends: pick any/all, then reimburse them in a
// single company transfer (bank + transaction number recorded once for the lot).
function PersonGroup({ person, rows }: { person: string; rows: PersonalRow[] }) {
  const [sel, setSel] = useState<Set<string>>(() => new Set(rows.map((r) => r.id)));

  const allOn = sel.size === rows.length && rows.length > 0;
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(rows.map((r) => r.id)));

  const selectedIds = useMemo(() => rows.filter((r) => sel.has(r.id)).map((r) => r.id), [rows, sel]);
  const total = useMemo(() => rows.filter((r) => sel.has(r.id)).reduce((s, r) => s + r.amount, 0), [rows, sel]);

  return (
    <details className="section" style={{ marginBottom: 12 }} open>
      <summary className="between" style={{ padding: "12px 16px", cursor: "pointer" }}>
        <span className="sec-title">{person}</span>
        <span className="small muted">{rows.length} spend{rows.length === 1 ? "" : "s"} · {inr(rows.reduce((s, r) => s + r.amount, 0))} owed</span>
      </summary>

      <div style={{ padding: "0 16px 16px" }}>
        <table className="t">
          <thead>
            <tr>
              <th style={{ width: 34 }}><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Date</th><th>Paid to</th><th>Category</th><th>Assigned to</th><th>Bank</th><th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => toggle(r.id)} style={{ cursor: "pointer", background: sel.has(r.id) ? "var(--accent-bg)" : undefined }}>
                <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} onClick={(e) => e.stopPropagation()} aria-label="Select" /></td>
                <td className="muted small">{r.date}</td>
                <td>{r.payee || <span className="muted">—</span>}</td>
                <td><span className="badge gray">{r.category}</span></td>
                <td className="muted small">{r.trip}</td>
                <td className="muted small">{r.bankName || "—"}</td>
                <td className="num" style={{ fontWeight: 500 }}>{inr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <form action={settleExpenses} style={{ marginTop: 12 }}>
          {selectedIds.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <div className="row-3">
            <label className="field"><span className="lbl">Transaction / UTR no.</span><input name="reference" placeholder="e.g. UTR 3287xxxx" /></label>
            <label className="field"><span className="lbl">Paid from (bank)</span>
              <input name="bankName" list="bank-names" placeholder="Company account…" />
            </label>
            <label className="field"><span className="lbl">Transfer date</span><input name="date" type="date" /></label>
          </div>
          <div className="row-3">
            <label className="field"><span className="lbl">Reimbursed to</span><input name="paidTo" defaultValue={person === "Unattributed" ? "" : person} placeholder="Person's name" /></label>
            <label className="field" style={{ gridColumn: "span 2" }}><span className="lbl">Notes <span className="small muted">optional</span></span><input name="notes" placeholder="Aug reimbursements…" /></label>
          </div>
          <button className="primary" type="submit" disabled={selectedIds.length === 0}>
            Settle {selectedIds.length} selected · {inr(total)}
          </button>
        </form>
      </div>
    </details>
  );
}

// The `bank-names` datalist is rendered once by the page and referenced here by id.
export default function SettlePersonal({ groups }: { groups: { person: string; rows: PersonalRow[] }[] }) {
  return (
    <div>
      {groups.map((g) => <PersonGroup key={g.person} person={g.person} rows={g.rows} />)}
    </div>
  );
}
