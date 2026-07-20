import { getSession } from "@/lib/auth";
import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";
import ChangePasswordForm from "./ChangePasswordForm";
import { updateOrgProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const ctx = await getOrgContext();
  const org = ctx?.orgId
    ? await prisma.organization.findUnique({
        where: { id: ctx.orgId },
        select: { name: true, legalName: true, gstin: true, gstAddress: true, gstState: true, gstStateCode: true, sacCode: true, invoiceNote: true, logo: true },
      })
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Signed in as {session?.email}{org ? ` · ${org.name}` : ""}{session?.isPlatformAdmin ? " · platform admin" : ""}</p>
        </div>
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
