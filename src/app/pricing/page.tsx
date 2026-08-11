import Link from "next/link";
import { PLANS } from "@/lib/billing";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Pricing",
  description: "TripZei is free while we're onboarding our first agencies. Every feature, no card, no trial clock.",
};

// Free, and said plainly.
//
// Two tiers at ₹1,999 and ₹4,999 asked people to book a quote call over an
// amount smaller than their monthly coffee budget, which is a worse deal for
// them and for us. Free removes the whole negotiation while there's nothing to
// negotiate about, and buys the thing we actually need: agencies using it.
export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <Link href="/" className="brand" style={{ justifyContent: "center", fontSize: 18 }}><Logo /></Link>
        </div>
        <h1 style={{ textAlign: "center", fontSize: 34, letterSpacing: "-0.02em" }}>Free, while we&apos;re young</h1>
        <p className="muted" style={{ textAlign: "center", maxWidth: 560, margin: "10px auto 0", lineHeight: 1.6 }}>
          TripZei is free for every agency onboarding now — the whole product, no card, no trial
          countdown. We&apos;d rather find out what it&apos;s worth to you by watching you use it than
          by guessing at a number today.
        </p>

        <div className="card" style={{ maxWidth: 560, margin: "26px auto 0", textAlign: "center", borderColor: "var(--accent)", borderWidth: 2 }}>
          <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-0.03em" }}>₹0</div>
          <div className="muted small" style={{ marginTop: 2 }}>per month, everything included</div>
          <div className="flex" style={{ gap: 8, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
            <Link className="btn primary" href="/signup">Create your workspace</Link>
            <Link className="btn" href="/demo">See the live demo</Link>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 30, alignItems: "stretch" }}>
          {PLANS.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div className="card-title" style={{ margin: 0 }}>{p.name}</div>
              <p className="muted small" style={{ margin: "2px 0 12px" }}>{p.tagline}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 4px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 14 }}><span style={{ color: "var(--success)" }}>✓</span> {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="card" style={{ marginTop: 26 }}>
          <div className="card-title">When it stops being free</div>
          <p className="muted small" style={{ margin: 0, lineHeight: 1.65 }}>
            At some point we&apos;ll charge — that&apos;s how this survives. When we do, you&apos;ll get
            plenty of notice, a founding-agency price that stays put, and your data is yours to export
            either way. Nothing you build here is held hostage.
          </p>
        </div>

        <p className="muted small" style={{ textAlign: "center", marginTop: 24 }}>
          Questions? Email <a href="mailto:hello@tripzei.com" style={{ color: "var(--accent)" }}>hello@tripzei.com</a>.
        </p>
      </div>
    </div>
  );
}
