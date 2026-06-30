import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { bookingBase, bookingTaxable, bookingGst, bookingTcs, bookingTax, bookingTotal, bookingPaid, bookingBalance, bookingInclTaxCharge, bookingInclNonTaxCharge, bookingInclusionCost } from "@/lib/calc";
import { formatINR } from "@/lib/money";
import { addPayment, deletePayment, setBookingStatus, deleteBooking, updateBookingInvoice, addTraveller, updateTraveller, deleteTraveller, setTaxRemitted, toggleBookingInclusion } from "../../data-actions";
import AutoFill from "@/components/AutoFill";
import CopyLink from "@/components/CopyLink";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
const PACKAGE: Record<string, string> = { land: "Land only", lva: "Land + visa (LVA)", full: "Full package" };

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
      trip: { include: { inclusions: { orderBy: { createdAt: "asc" } } } },
      variant: true, customer: true,
      travellers: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { date: "asc" } },
      inclusions: { orderBy: { bookedAt: "asc" } },
    },
  });
  if (!b) notFound();

  // Known ages from every traveller ever added, so the same person's age
  // auto-fills next time they're entered on any trip (most recent age wins).
  const knownPeople = await prisma.traveller.findMany({
    where: { age: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { name: true, age: true },
  });
  const ageMap: Record<string, { age?: number | null }> = {};
  for (const p of knownPeople) {
    const k = p.name.trim().toLowerCase();
    if (!(k in ageMap)) ageMap[k] = { age: p.age };
  }

  const base = bookingBase(b);
  const taxable = bookingTaxable(b);
  const gst = bookingGst(b);
  const tcs = bookingTcs(b);
  const total = bookingTotal(b);
  const paid = bookingPaid(b);
  const balance = bookingBalance(b);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const Line = ({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) => (
    <div className="between" style={{ padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
      <span className={muted ? "muted" : ""} style={{ fontSize: 14, fontWeight: strong ? 500 : 400 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: strong ? 500 : 400, fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href={`/trips/${b.tripId}`} style={{ color: "var(--text-2)" }}>← {b.trip.name}</Link></div>
          <h1 style={{ marginTop: 6 }}>{b.customerName}</h1>
          <p className="sub">
            <span className="badge accent" style={{ marginRight: 8 }}>{PACKAGE[b.packageType] || b.packageType}</span>
            {b.pax} pax{b.customerPhone ? ` · ${b.customerPhone}` : ""}
            {b.customerId ? <> · <Link href={`/customers/${b.customerId}`} style={{ color: "var(--accent)" }}>View customer</Link></> : null}
          </p>
        </div>
        <form action={deleteBooking}>
          <input type="hidden" name="id" value={b.id} />
          <button className="danger sm" type="submit">Delete booking</button>
        </form>
      </div>

      <div className="metrics">
        <div className="metric c-violet"><div className="label">Invoice total</div><div className="value">{formatINR(total)}</div><div className="foot">incl. GST + TCS</div></div>
        <div className="metric c-emerald"><div className="label">Paid</div><div className="value">{formatINR(paid)}</div></div>
        <div className={`metric ${balance > 0 ? "c-rose" : "c-emerald"}`}><div className="label">Balance</div><div className="value">{formatINR(balance)}</div></div>
        <div className="metric"><div className="label">Status</div><div style={{ marginTop: 6 }}>
          <form action={setBookingStatus} className="inline-form">
            <input type="hidden" name="id" value={b.id} />
            <select name="status" defaultValue={b.status} style={{ width: 140 }}>
              <option value="enquiry">enquiry</option><option value="confirmed">confirmed</option>
              <option value="travelled">travelled</option><option value="cancelled">cancelled</option>
            </select>
            <button className="sm" type="submit">Save</button>
          </form>
        </div></div>
      </div>

      {bookingTax(b) > 0 && (
        <div className="card between" style={{ background: b.taxRemitted ? "var(--success-bg)" : "var(--warning-bg)", borderColor: "transparent", flexWrap: "wrap", gap: 10 }}>
          <span className="small" style={{ color: b.taxRemitted ? "var(--success)" : "var(--warning)" }}>
            <b>GST + TCS: {formatINR(bookingTax(b))}</b> — {b.taxRemitted
              ? <>paid to govt{b.taxRemittedOn ? ` on ${b.taxRemittedOn.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}{b.taxRemittedNote ? ` · ${b.taxRemittedNote}` : ""} ✓</>
              : "still to remit to the government"}
          </span>
          <form action={setTaxRemitted}>
            <input type="hidden" name="id" value={b.id} />
            <input type="hidden" name="remit" value={b.taxRemitted ? "0" : "1"} />
            <button className="sm" type="submit">{b.taxRemitted ? "Mark unpaid" : "Mark GST paid to govt"}</button>
          </form>
        </div>
      )}

      {b.notes ? (
        <div className="card" style={{ background: "var(--warning-bg)", borderColor: "var(--warning-bg)" }}>
          <span className="small" style={{ color: "var(--warning)" }}><b>Remarks:</b> {b.notes}</span>
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">
          Travellers
          <span className="small muted">{b.travellers.length} of {b.pax} named{b.travellers.length !== b.pax ? " · update pax in the invoice if needed" : ""}</span>
        </div>
        {b.travellers.length === 0 ? (
          <div className="empty small">{b.pax === 1 ? `Single traveller — it's ${b.customerName} (filled in below, just add age if you like).` : "No people added yet. Add each family member below."}</div>
        ) : (
          <table className="t">
            <thead><tr><th>#</th><th>Name</th><th>Age</th><th></th><th>Extra charge</th><th></th></tr></thead>
            <tbody>
              {b.travellers.map((tr, i) => (
                <tr key={tr.id}>
                  <td className="muted small">{i + 1}</td>
                  <td>
                    <form action={updateTraveller} className="inline-form" id={`tr-${tr.id}`}>
                      <input type="hidden" name="id" value={tr.id} />
                      <input name="name" defaultValue={tr.name} style={{ maxWidth: 220 }} />
                    </form>
                  </td>
                  <td>
                    <input name="age" defaultValue={tr.age ?? ""} form={`tr-${tr.id}`} type="number" min="0" max="120" placeholder="—" style={{ width: 70 }} />
                  </td>
                  <td>
                    {tr.age != null && tr.age < 12 ? <span className="badge amber">child</span> : null}
                  </td>
                  <td>
                    <span className="flex" style={{ gap: 6 }}>
                      <input name="extraCharge" defaultValue={tr.extraCharge || ""} form={`tr-${tr.id}`} placeholder="₹0" style={{ width: 90 }} />
                      <input name="extraNote" defaultValue={tr.extraNote || ""} form={`tr-${tr.id}`} placeholder="why? e.g. single room" style={{ width: 150 }} />
                    </span>
                  </td>
                  <td className="num">
                    <span className="flex" style={{ justifyContent: "flex-end", gap: 6 }}>
                      <button className="sm" type="submit" form={`tr-${tr.id}`}>Save</button>
                      <form action={deleteTraveller}><input type="hidden" name="id" value={tr.id} /><button className="sm" type="submit" aria-label="Remove">✕</button></form>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="add" open={b.travellers.length === 0}>
          <summary>+ Add traveller</summary>
          <div className="form-box">
            <form action={addTraveller}>
              <input type="hidden" name="bookingId" value={b.id} />
              <AutoFill sourceId="tr-name" fills={[{ targetId: "tr-age", key: "age" }]} data={ageMap} />
              <div className="row-3">
                <label className="field"><span className="lbl">Name</span><input id="tr-name" name="name" list="people-list" defaultValue={b.travellers.length === 0 ? b.customerName : ""} placeholder="Aarav Sharma" required /></label>
                <label className="field"><span className="lbl">Age</span><input id="tr-age" name="age" type="number" min="0" max="120" placeholder="optional" /></label>
                <label className="field"><span className="lbl">Extra charge (optional)</span><input name="extraCharge" placeholder="₹ for this person only" /></label>
              </div>
              <label className="field"><span className="lbl">Extra charge reason</span><input name="extraNote" placeholder="e.g. single room supplement" /></label>
              <datalist id="people-list">
                {Object.keys(ageMap).length > 0 && knownPeople
                  .filter((p, idx, arr) => arr.findIndex((q) => q.name.trim().toLowerCase() === p.name.trim().toLowerCase()) === idx)
                  .map((p) => <option key={p.name} value={p.name} />)}
              </datalist>
              <button className="primary sm" type="submit">Add traveller</button>
            </form>
          </div>
        </details>
      </div>

      {b.trip.inclusions.length > 0 && (
        <div className="card">
          <div className="card-title">
            Inclusions
            <span className="small muted">tick what this party gets · prices × {b.pax} pax</span>
          </div>
          <div>
            {b.trip.inclusions.map((inc) => {
              const sel = b.inclusions.find((s) => s.inclusionId === inc.id);
              const on = !!sel;
              const perPP = inc.isDefault ? inc.cost : inc.sellContribution;
              return (
                <div key={inc.id} className="between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex" style={{ gap: 12, alignItems: "flex-start" }}>
                    <form action={toggleBookingInclusion} style={{ marginTop: 1 }}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="inclusionId" value={inc.id} />
                      <input type="hidden" name="on" value={on ? "0" : "1"} />
                      <button type="submit" className={`incl-toggle ${on ? "on" : ""}`} aria-label={on ? "Remove" : "Add"}>{on ? "✓" : ""}</button>
                    </form>
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {inc.name}{" "}
                        {inc.isDefault ? <span className="badge green">default</span> : <span className="badge gray">optional</span>}{" "}
                        {!inc.taxable && <span className="badge gray">no tax</span>}
                      </div>
                      <div className="small muted">
                        {inc.isDefault ? `cost ${formatINR(inc.cost)}/pp · in package` : `charge ${formatINR(inc.sellContribution)}/pp · cost ${formatINR(inc.cost)}/pp`}
                        {sel ? ` · booked ${fmtDate(sel.bookedAt)} @ ${formatINR(inc.isDefault ? sel.cost : sel.charge)}/pp` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="right" style={{ whiteSpace: "nowrap" }}>
                    {on ? (
                      <>
                        <div style={{ fontWeight: 600 }}>{inc.isDefault ? <span className="muted">cost {formatINR(sel!.cost * b.pax)}</span> : `+ ${formatINR(sel!.charge * b.pax)}`}</div>
                        <div className="small muted">{formatINR(inc.isDefault ? sel!.cost : sel!.charge)} × {b.pax}</div>
                      </>
                    ) : <span className="muted small">not added · {formatINR(perPP)}/pp</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Defaults add to your cost only. Optional ones add to the customer’s bill (and your cost). Each tick locks in today’s price.</p>
        </div>
      )}

      <div className="grid-2">
        {/* INVOICE */}
        <div className="card">
          <div className="card-title">Invoice</div>
          {b.landAmount > 0 && <Line label="Land package" value={formatINR(b.landAmount)} />}
          {b.visaAmount > 0 && <Line label="Visa assistance" value={formatINR(b.visaAmount)} />}
          {b.flightAmount > 0 && <Line label="Flights" value={formatINR(b.flightAmount)} />}
          {base === 0 && <div className="empty small">No package amount set yet. Edit the invoice below.</div>}
          {b.discount > 0 && <Line label={`Discount${b.discountReason ? " · " + b.discountReason : ""}`} value={`− ${formatINR(b.discount)}`} muted />}
          {bookingInclTaxCharge(b) > 0 && <Line label="Inclusions (taxable)" value={formatINR(bookingInclTaxCharge(b))} muted />}
          {b.travellerExtra > 0 && <Line label="Per-person extras" value={formatINR(b.travellerExtra)} muted />}
          <Line label="Taxable value" value={formatINR(taxable)} strong />
          <Line label={`GST @ ${b.gstRate}%`} value={formatINR(gst)} muted />
          <Line label={`TCS @ ${b.tcsRate}%`} value={formatINR(tcs)} muted />
          {b.nonTaxable > 0 && <Line label="Non-taxable (no GST/TCS)" value={formatINR(b.nonTaxable)} muted />}
          {bookingInclNonTaxCharge(b) > 0 && <Line label="Inclusions (no tax)" value={formatINR(bookingInclNonTaxCharge(b))} muted />}
          <div className="between" style={{ paddingTop: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Invoice total</span>
            <span style={{ fontSize: 16, fontWeight: 500 }}>{formatINR(total)}</span>
          </div>

          <details className="add">
            <summary>Edit invoice</summary>
            <div className="form-box">
              <form action={updateBookingInvoice}>
                <input type="hidden" name="id" value={b.id} />
                <div className="row-3">
                  <label className="field"><span className="lbl">Party name</span><input name="customerName" defaultValue={b.customerName} /></label>
                  <label className="field"><span className="lbl">Phone</span><input name="customerPhone" defaultValue={b.customerPhone || ""} /></label>
                  <label className="field"><span className="lbl">Package</span>
                    <select name="packageType" defaultValue={b.packageType}><option value="land">Land only</option><option value="lva">Land + visa (LVA)</option><option value="full">Full (incl. flights)</option></select>
                  </label>
                </div>
                <div className="row-3">
                  <label className="field"><span className="lbl">Land cost</span><input name="landAmount" defaultValue={b.landAmount || ""} /></label>
                  <label className="field"><span className="lbl">Visa assistance</span><input name="visaAmount" defaultValue={b.visaAmount || ""} /></label>
                  <label className="field"><span className="lbl">Flights</span><input name="flightAmount" defaultValue={b.flightAmount || ""} /></label>
                </div>
                <div className="row-3">
                  <label className="field"><span className="lbl">Travellers (pax)</span><input name="pax" type="number" min="1" defaultValue={b.pax} /></label>
                  <label className="field"><span className="lbl">Discount</span><input name="discount" defaultValue={b.discount || ""} /></label>
                  <label className="field"><span className="lbl">Discount reason</span><input name="discountReason" defaultValue={b.discountReason || ""} /></label>
                </div>
                <div className="row-3">
                  <label className="field"><span className="lbl">Non-taxable amount</span><input name="nonTaxable" defaultValue={b.nonTaxable || ""} placeholder="embassy fee, etc." /></label>
                  <label className="field"><span className="lbl">GST %</span><input name="gstRate" type="number" min="0" step="0.01" defaultValue={b.gstRate} /></label>
                  <label className="field"><span className="lbl">TCS %</span><input name="tcsRate" type="number" min="0" step="0.01" defaultValue={b.tcsRate} /></label>
                </div>
                <label className="field"><span className="lbl">Remarks</span><input name="notes" defaultValue={b.notes || ""} placeholder="e.g. 1 night less, Perlan paid extra" /></label>
                <button className="primary sm" type="submit">Save invoice</button>
              </form>
            </div>
          </details>
        </div>

        {/* PAYMENTS */}
        <div className="card">
          <div className="card-title">Payments</div>
          <div className="bar" style={{ marginBottom: 6 }}><span className={balance > 0 ? "amber" : ""} style={{ width: `${pct}%` }} /></div>
          <div className="small muted" style={{ marginBottom: 12 }}>{pct}% collected · {formatINR(balance)} remaining</div>
          <div className="form-box" style={{ marginBottom: 12 }}>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>🔗 Payment link for the customer</div>
            <CopyLink path={`/pay/${b.id}`} label="Copy link" />
            <p className="small muted" style={{ margin: "8px 0 0" }}>Send this to {b.customerName}. They confirm their payment + upload a screenshot; it appears under “awaiting approval” on the Payments page.</p>
          </div>

          {b.payments.length === 0 ? (
            <div className="empty">No payments recorded yet.</div>
          ) : (
            <table className="t">
              <thead><tr><th>Date</th><th>Mode</th><th className="num">Amount</th><th></th></tr></thead>
              <tbody>
                {b.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="muted small">{fmtDate(p.date)}</td>
                    <td><span className="badge gray">{p.mode}</span>{p.note ? <div className="small muted">{p.note}</div> : null}</td>
                    <td className="num" style={{ fontWeight: 500 }}>{formatINR(p.amount)}</td>
                    <td className="num"><form action={deletePayment}><input type="hidden" name="id" value={p.id} /><button className="sm" type="submit" aria-label="Delete">✕</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <details className="add" open={b.payments.length === 0}>
            <summary>+ Record payment</summary>
            <div className="form-box">
              <form action={addPayment}>
                <input type="hidden" name="bookingId" value={b.id} />
                <div className="row-3">
                  <label className="field"><span className="lbl">Amount</span><input name="amount" placeholder="40000 or 40k" required /></label>
                  <label className="field"><span className="lbl">Mode</span>
                    <select name="mode" defaultValue="upi"><option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option><option value="bank">Bank transfer</option><option value="other">Other</option></select>
                  </label>
                  <label className="field"><span className="lbl">Date</span><input name="date" type="date" /></label>
                </div>
                <label className="field"><span className="lbl">Note</span><input name="note" placeholder="Advance / balance / installment 2" /></label>
                <button className="primary sm" type="submit">Record payment</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
