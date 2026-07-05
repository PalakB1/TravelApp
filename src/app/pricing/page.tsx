import Link from "next/link";
import { PLANS } from "@/lib/billing";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Pricing — Trip Desk" };

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", padding: "48px 20px 80px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <Link href="/" className="brand" style={{ justifyContent: "center", fontSize: 18 }}><span className="dot">✦</span> Trip Desk</Link>
        </div>
        <h1 style={{ textAlign: "center", fontSize: 34, letterSpacing: "-0.02em" }}>Simple pricing</h1>
        <p className="muted" style={{ textAlign: "center", maxWidth: 520, margin: "10px auto 0" }}>
          Start with a <b>30-day free trial</b> — no card needed. Keep going on a plan that fits your agency.
        </p>

        <div className="grid-2" style={{ marginTop: 34, alignItems: "stretch" }}>
          {PLANS.map((p, i) => (
            <div key={p.id} className="card" style={{ display: "flex", flexDirection: "column", borderColor: i === 0 ? "var(--accent)" : "var(--border)", borderWidth: i === 0 ? 2 : 1 }}>
              <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title" style={{ margin: 0 }}>{p.name}</div>
                {i === 0 && <span className="badge accent">Most popular</span>}
              </div>
              <p className="muted small" style={{ margin: "2px 0 12px" }}>{p.tagline}</p>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}>{formatINR(p.price)}<span className="muted" style={{ fontSize: 15, fontWeight: 400 }}>/month</span></div>
              <div className="muted small" style={{ marginBottom: 14 }}>or {formatINR(p.yearly)}/year (save ~2 months)</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 14 }}><span style={{ color: "var(--success)" }}>✓</span> {f}</li>
                ))}
              </ul>
              <Link className={`btn ${i === 0 ? "primary" : ""}`} href="/signup" style={{ justifyContent: "center" }}>Start free trial</Link>
            </div>
          ))}
        </div>

        <p className="muted small" style={{ textAlign: "center", marginTop: 24 }}>
          Prices in ₹, exclusive of GST. Pay by UPI, netbanking or card. Questions? <Link href="/signup" style={{ color: "var(--accent)" }}>Just start a trial</Link> — you can decide later.
        </p>
      </div>
    </div>
  );
}
