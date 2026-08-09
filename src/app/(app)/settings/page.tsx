import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import ChangePasswordForm from "./ChangePasswordForm";
import { updateOrgProfile, updateRefundPolicy } from "./actions";
import { STANDARD_REFUND_POLICY } from "@/lib/policy";
import { createPlanTemplate, deletePlanTemplate, setDefaultPlanTemplate, addTemplateStep, deleteTemplateStep } from "../data-actions";
import TourToggle from "@/components/TourToggle";

export const dynamic = "force-dynamic";

// Plain-English description of a template step.
function stepDesc(s: { kind: string; percent: number | null; amount: number | null; daysBeforeTravel: number | null }) {
  const amt = s.kind === "fixed" ? formatINR(s.amount ?? 0) : s.kind === "balance" ? "remaining balance" : `${s.percent ?? 0}%`;
  const when = s.daysBeforeTravel == null ? "due now" : `${s.daysBeforeTravel} days before travel`;
  return `${amt} · ${when}`;
}

export default async function SettingsPage() {
  const session = await getSession();
  const ctx = await getOrgContext();
  const org = ctx?.orgId
    ? await prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: { name: true, legalName: true, gstin: true, gstAddress: true, gstState: true, gstStateCode: true, sacCode: true, invoiceNote: true, logo: true, defaultRefundPolicy: true },
      })
    : null;

  const planTemplates = ctx?.orgId
    ? await prisma.paymentPlanTemplate.findMany({ where: { orgId: ctx.orgId }, orderBy: { order: "asc" }, include: { steps: { orderBy: { order: "asc" } } } })
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Signed in as {session?.email}{org ? ` · ${org.name}` : ""}{session?.isPlatformAdmin ? " · platform admin" : ""}</p>
        </div>
      </div>

      {/* Homes for the things that used to sit in the sidebar. */}
      <div className="card">
        <div className="card-title">Workspace</div>
        <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn sm" href="/team">👥 Team &amp; access</Link>
          <Link className="btn sm" href="/trash">🗑️ Recycle bin</Link>
        </div>
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          Invite colleagues and set who can see which trips, or restore something you deleted.
        </p>
      </div>

      <div className="card">
        <div className="card-title">Guided tour <span className="small muted">a walk through what each screen is for</span></div>
        <TourToggle />
      </div>

      {org && (
        <div className="card">
          <div className="card-title">Business &amp; branding <span className="small muted">shown on pay pages, receipts &amp; tax invoices</span></div>
          <form action={updateOrgProfile}>
            <div className="row-2">
              <label className="field"><span className="lbl">Business name (shown to customers)</span><input name="name" defaultValue={org.name || ""} placeholder="e.g. My Travel Storiis" /></label>
              <label className="field"><span className="lbl">Logo (PNG/JPG, under 1 MB)</span><input name="logo" type="file" accept="image/*" style={{ padding: 7 }} /></label>
            </div>
            {org.logo && (
              <div className="flex" style={{ gap: 12, alignItems: "center", marginBottom: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={org.logo} alt="current logo" style={{ height: 46, maxWidth: 160, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", padding: 4 }} />
                <label className="flex small muted" style={{ gap: 6, cursor: "pointer" }}><input type="checkbox" name="removeLogo" value="yes" /> Remove logo</label>
              </div>
            )}
            <div className="row-2">
              <label className="field"><span className="lbl">Legal business name</span><input name="legalName" defaultValue={org.legalName || ""} placeholder="e.g. My Travel Storiis Pvt Ltd" /></label>
              <label className="field"><span className="lbl">GSTIN</span><input name="gstin" defaultValue={org.gstin || ""} placeholder="15-digit GSTIN" /></label>
            </div>
            <label className="field"><span className="lbl">Registered address</span><input name="gstAddress" defaultValue={org.gstAddress || ""} placeholder="Full address as on GST registration" /></label>
            <div className="row-3">
              <label className="field"><span className="lbl">State</span><input name="gstState" defaultValue={org.gstState || ""} placeholder="e.g. Maharashtra" /></label>
              <label className="field"><span className="lbl">State code</span><input name="gstStateCode" defaultValue={org.gstStateCode || ""} placeholder="e.g. 27" /></label>
              <label className="field"><span className="lbl">SAC code</span><input name="sacCode" defaultValue={org.sacCode || "998555"} placeholder="998555" /></label>
            </div>
            <label className="field"><span className="lbl">Invoice note / declaration</span><input name="invoiceNote" defaultValue={org.invoiceNote || ""} placeholder="e.g. Subject to Pune jurisdiction. E.&O.E." /></label>
            <button className="primary sm" type="submit">Save business details</button>
          </form>
        </div>
      )}

      {org && (
        <div className="card">
          <div className="card-title">Cancellation &amp; refund policy <span className="small muted">auto-fills on every new booking · each booking can still override it</span></div>
          <form action={updateRefundPolicy}>
            <label className="field">
              <span className="lbl">Your standard terms</span>
              <textarea
                name="defaultRefundPolicy"
                rows={16}
                defaultValue={org.defaultRefundPolicy ?? STANDARD_REFUND_POLICY}
                style={{ fontFamily: "inherit", lineHeight: 1.55 }}
              />
            </label>
            <div className="flex" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="primary sm" type="submit">Save policy</button>
              {org.defaultRefundPolicy && org.defaultRefundPolicy !== STANDARD_REFUND_POLICY && (
                <span className="small muted">Edited from the standard wording.</span>
              )}
            </div>
          </form>
          {org.defaultRefundPolicy && org.defaultRefundPolicy !== STANDARD_REFUND_POLICY && (
            <form action={updateRefundPolicy} style={{ marginTop: 8 }}>
              <input type="hidden" name="defaultRefundPolicy" value={STANDARD_REFUND_POLICY} />
              <button className="sm" type="submit" title="Replace your wording with the standard policy">↺ Restore standard wording</button>
            </form>
          )}
          {!org.defaultRefundPolicy && (
            <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
              You&apos;re seeing the standard policy. Save it as-is to lock it in, or edit it first.
            </p>
          )}
        </div>
      )}

      {org && (
        <div className="card">
          <div className="card-title">Payment plans <span className="small muted">set up once, then assign to any booking with one tap</span></div>

          {planTemplates.length === 0 ? (
            <div className="empty" style={{ padding: "12px 8px" }}>No plans yet. Start from a common one below, or build your own.</div>
          ) : (
            <div className="stack" style={{ gap: 12 }}>
              {planTemplates.map((t) => (
                <div key={t.id} className="form-box">
                  <div className="between" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                    <div className="flex" style={{ gap: 8, alignItems: "center" }}>
                      <b>{t.name}</b>
                      {t.isDefault && <span className="badge accent">default</span>}
                    </div>
                    <div className="flex" style={{ gap: 6 }}>
                      {!t.isDefault && <form action={setDefaultPlanTemplate}><input type="hidden" name="id" value={t.id} /><button className="sm" type="submit">Make default</button></form>}
                      <form action={deletePlanTemplate}><input type="hidden" name="id" value={t.id} /><button className="sm" type="submit" title="Delete this plan">Delete</button></form>
                    </div>
                  </div>

                  {t.steps.length === 0 ? (
                    <p className="small muted">No steps yet — add the first below.</p>
                  ) : (
                    <table className="t" style={{ marginBottom: 8 }}>
                      <tbody>
                        {t.steps.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.label}</td>
                            <td className="muted small">{stepDesc(s)}</td>
                            <td className="num"><form action={deleteTemplateStep}><input type="hidden" name="id" value={s.id} /><button className="sm" type="submit" aria-label="Delete step">✕</button></form></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <details className="add">
                    <summary>+ Add a step</summary>
                    <div className="form-box">
                      <form action={addTemplateStep}>
                        <input type="hidden" name="templateId" value={t.id} />
                        <div className="row-3">
                          <label className="field"><span className="lbl">Name</span><input name="label" placeholder="Advance / Balance" /></label>
                          <label className="field"><span className="lbl">Type</span>
                            <select name="kind" defaultValue="percent">
                              <option value="percent">% of total</option>
                              <option value="fixed">Flat amount ₹</option>
                              <option value="balance">Whatever&apos;s left</option>
                            </select>
                          </label>
                          <label className="field"><span className="lbl">Value <span className="small muted">% or ₹ (skip for &quot;left&quot;)</span></span>
                            <input name="percent" placeholder="25 (for %)" />
                          </label>
                        </div>
                        <div className="row-3" style={{ alignItems: "end" }}>
                          <label className="field"><span className="lbl">Flat ₹ <span className="small muted">only if type = flat</span></span><input name="amount" placeholder="15000 or 15k" /></label>
                          <label className="field"><span className="lbl">Due <span className="small muted">days before travel · blank = now</span></span><input name="daysBeforeTravel" type="number" min="0" placeholder="21 (blank = due now)" /></label>
                          <button className="primary sm" type="submit">Add step</button>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div className="small muted" style={{ marginBottom: 8 }}>Quick start — creates a ready-made plan you can rename or tweak:</div>
            <div className="flex" style={{ gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <form action={createPlanTemplate}><input type="hidden" name="preset" value="standard" /><button className="sm" type="submit">＋ 25% + balance</button></form>
              <form action={createPlanTemplate}><input type="hidden" name="preset" value="half" /><button className="sm" type="submit">＋ 50% + 50%</button></form>
              <form action={createPlanTemplate}><input type="hidden" name="preset" value="full" /><button className="sm" type="submit">＋ Full on booking</button></form>
            </div>
            <form action={createPlanTemplate} className="flex" style={{ gap: 8, alignItems: "end" }}>
              <label className="field" style={{ flex: 1 }}><span className="lbl">Or a blank plan</span><input name="name" placeholder="Plan name, e.g. Honeymoon terms" /></label>
              <button className="primary sm" type="submit">Create plan</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Change password</div>
        <p className="muted small" style={{ marginTop: -4, marginBottom: 16 }}>
          Set a password only you know. You’ll need your current password to confirm it’s you.
        </p>
        <ChangePasswordForm />
      </div>
    </>
  );
}
