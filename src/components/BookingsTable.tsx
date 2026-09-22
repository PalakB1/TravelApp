"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney, INR, type MoneyCfg } from "@/lib/money";
import { visaMeta, VISA_STATUSES } from "@/lib/visaStatus";
import { generateInvoice } from "@/app/(app)/data-actions";
import EarlyInvoice from "./EarlyInvoice";

export type BookingRow = {
  id: string;
  name: string;
  trip?: string;
  pax: number;
  status: string;
  visaStatus: string;
  visaHandledBy?: string | null;
  total: number;
  paid: number;
  balance: number;
  discount?: number;
  discountReason?: string | null;
  invoiceNo?: string | null;
  /** Shortfall accepted — still owed, no longer chased. */
  paymentsClosed?: boolean;
  tripOver?: boolean;
  /** Formatted trip end date — shown when invoicing ahead of it. */
  tripEnds?: string | null;
};

const STATUSES = ["confirmed", "enquiry", "travelled", "cancelled"];

// Once a trip's last day has passed, a confirmed booking has travelled. Derived
// here so the badge, the filter and the counts all agree without anyone having
// to tick fifty bookings over by hand.
const shownStatus = (b: { status: string; tripOver?: boolean }) =>
  b.status === "confirmed" && b.tripOver ? "travelled" : b.status;
const statusBadge = (s: string) => {
  const map: Record<string, string> = { confirmed: "green", travelled: "accent", enquiry: "amber", cancelled: "red" };
  return <span className={`badge ${map[s] || "gray"}`}>{s}</span>;
};

const SORTS: { v: string; label: string }[] = [
  { v: "", label: "Sort: newest" },
  { v: "balance_desc", label: "Balance: high → low" },
  { v: "balance_asc", label: "Balance: low → high" },
  { v: "total_desc", label: "Total: high → low" },
  { v: "paid_desc", label: "Paid: high → low" },
  { v: "name_asc", label: "Name: A → Z" },
  { v: "visa", label: "Visa: needs action first" },
];
// Visa sort: things that need work bubble to the top.
const VISA_ORDER = ["rejected", "required", "initiated", "submitted", "approved", "held", "not_required"];

const CAP_MOBILE = 5; // rows shown before "Show all" — phone
const CAP_DESKTOP = 10; // ...and laptop

export default function BookingsTable({ rows, showTrip = false, initialVisa = "", money = INR }: { rows: BookingRow[]; showTrip?: boolean; initialVisa?: string; money?: MoneyCfg }) {
  // A client component can't await the org lookup, so the currency arrives as a
  // plain serialisable object and the formatter is built here.
  const fmt = (n: number) => formatMoney(n, money);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  // Pre-set when arriving from the dashboard's "visas need action" tile.
  const [visa, setVisa] = useState(initialVisa);
  const [sort, setSort] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const view = useMemo(() => {
    let r = rows;
    if (q) { const ql = q.toLowerCase(); r = r.filter((x) => `${x.name} ${x.trip || ""}`.toLowerCase().includes(ql)); }
    // Filter on what the row SHOWS, or picking "travelled" would miss every
    // finished trip whose bookings still say confirmed underneath.
    if (status) r = r.filter((x) => shownStatus(x) === status);
    if (visa) r = r.filter((x) => x.visaStatus === visa);
    if (sort) {
      r = [...r];
      switch (sort) {
        case "balance_desc": r.sort((a, b) => b.balance - a.balance); break;
        case "balance_asc": r.sort((a, b) => a.balance - b.balance); break;
        case "total_desc": r.sort((a, b) => b.total - a.total); break;
        case "paid_desc": r.sort((a, b) => b.paid - a.paid); break;
        case "name_asc": r.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "visa": r.sort((a, b) => VISA_ORDER.indexOf(a.visaStatus) - VISA_ORDER.indexOf(b.visaStatus)); break;
      }
    }
    return r;
  }, [rows, q, status, visa, sort]);

  const filtering = q || status || visa;
  const activeCap = isMobile ? CAP_MOBILE : CAP_DESKTOP;
  const capped = expanded ? view : view.slice(0, activeCap);

  // An amber balance means "chase this". A closed booking still owes the money
  // but nobody is chasing it, so it mustn't wear the same badge.
  const balanceBadge = (b: BookingRow) =>
    b.balance <= 0 ? <span className="badge green">paid</span>
      : b.paymentsClosed
        ? <span className="badge emerald" title={`${fmt(b.balance)} accepted as unpaid`}>closed</span>
        : <span className="badge amber">{fmt(b.balance)}</span>;

  // Invoice action — shared by the desktop table and the mobile cards.
  const invoiceAction = (b: BookingRow) =>
    b.invoiceNo ? (
      <Link className="btn sm" href={`/invoice/${b.id}`} target="_blank" rel="noopener" title={`Tax invoice ${b.invoiceNo}`}>🧾 {b.invoiceNo}</Link>
    ) : b.status === "cancelled" ? (
      <span className="small muted">—</span>
    ) : b.tripOver ? (
      <form action={generateInvoice}><input type="hidden" name="id" value={b.id} /><button type="submit" className="btn sm primary">Generate invoice</button></form>
    ) : (
      // Not blocked any more — just deliberate. See EarlyInvoice.
      <EarlyInvoice id={b.id} customerName={b.name} endsOn={b.tripEnds} />
    );

  return (
    <div>
      <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`🔍  Search ${showTrip ? "customer or trip" : "customer"}…`} style={{ maxWidth: 220 }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={visa} onChange={(e) => setVisa(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">All visa</option>
          {VISA_STATUSES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ maxWidth: 190 }}>
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        {filtering && <span className="small muted" style={{ marginLeft: "auto" }}>{view.length} of {rows.length}</span>}
      </div>

      {isMobile ? (
        /* Phone: one clean card per booking instead of a cramped 9-column table. */
        <div className="stack" style={{ gap: 10 }}>
          {capped.map((b) => (
            <div key={b.id} className="form-box">
              <div className="between" style={{ alignItems: "flex-start", gap: 8 }}>
                <div>
                  <Link className="row-link" href={`/bookings/${b.id}`} style={{ fontWeight: 600 }}>{b.name}</Link>
                  {showTrip && b.trip && <div className="small muted">{b.trip}</div>}
                  {b.discount ? <div className="small muted">−{fmt(b.discount)} {b.discountReason || "discount"}</div> : null}
                </div>
                {statusBadge(shownStatus(b))}
              </div>
              <div className="between" style={{ marginTop: 10, alignItems: "center" }}>
                <div>
                  <div className="small muted" style={{ marginBottom: 3 }}>Balance</div>
                  {balanceBadge(b)}
                </div>
                <div className="small muted" style={{ textAlign: "right" }}>
                  {b.pax} pax · {fmt(b.paid)} / {fmt(b.total)}
                  {b.visaStatus !== "not_required" && <div style={{ marginTop: 4 }}><span className={`badge ${visaMeta(b.visaStatus).badge}`}>{visaMeta(b.visaStatus).short}</span></div>}
                </div>
              </div>
              <div style={{ marginTop: 10 }}>{invoiceAction(b)}</div>
            </div>
          ))}
        </div>
      ) : (
        <table className="t">
          <thead>
            <tr>
              <th>{showTrip ? "Customer" : "Party"}</th>
              {showTrip && <th>Trip</th>}
              <th>Pax</th>
              <th>Status</th>
              <th>Visa</th>
              <th className="num">Total</th>
              <th className="num">Paid</th>
              <th className="num">Balance</th>
              <th className="num">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {capped.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link className="row-link" href={`/bookings/${b.id}`}>{b.name}</Link>
                  {b.discount ? <div className="small muted">−{fmt(b.discount)} {b.discountReason || "discount"}</div> : null}
                </td>
                {showTrip && <td className="muted">{b.trip}</td>}
                <td className="muted">{b.pax}</td>
                <td>{statusBadge(shownStatus(b))}</td>
                <td>{b.visaStatus === "not_required" ? <span className="small muted">—</span> : <span className={`badge ${visaMeta(b.visaStatus).badge}`}>{visaMeta(b.visaStatus).short}</span>}</td>
                <td className="num">{fmt(b.total)}</td>
                <td className="num">{fmt(b.paid)}</td>
                <td className="num">{balanceBadge(b)}</td>
                <td className="num">{invoiceAction(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {view.length === 0 && <div className="empty">No bookings match these filters.</div>}
      {view.length > activeCap && (
        <button type="button" className="btn sm showall-btn" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : `Show all ${view.length} →`}
        </button>
      )}
    </div>
  );
}
