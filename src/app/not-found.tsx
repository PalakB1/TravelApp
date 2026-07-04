import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <div className="brand" style={{ justifyContent: "center", paddingBottom: 10 }}>
          <span className="dot">✦</span> Trip Desk
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>This page moved or no longer exists</h2>
        <p className="muted small" style={{ marginBottom: 18 }}>
          The link you followed may be old. Everything is still here — head back to the dashboard and open it fresh.
        </p>
        <Link className="btn primary" href="/dashboard" style={{ justifyContent: "center" }}>Go to dashboard</Link>
      </div>
    </div>
  );
}
