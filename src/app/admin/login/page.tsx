"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLogin, undefined);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "radial-gradient(1200px 600px at 50% -10%, #1a1c2e, #0b0c14)" }}>
      <div style={{ width: 380, maxWidth: "100%", background: "rgba(22,24,38,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.5)", color: "#e8e9f2" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 18 }}>
          <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7c5cff,#4f6bff)", fontSize: 18 }}>🛡️</span>
          Platform admin
        </div>
        <p style={{ margin: "8px 0 20px", fontSize: 13, color: "#9aa0c0" }}>
          Restricted area — for the Trip Desk platform owner.
        </p>
        <form action={formAction}>
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ display: "block", fontSize: 12, color: "#9aa0c0", marginBottom: 6 }}>Admin email</span>
            <input name="email" type="email" placeholder="admin@…" autoComplete="username"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14 }} />
          </label>
          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ display: "block", fontSize: 12, color: "#9aa0c0", marginBottom: 6 }}>Password</span>
            <input name="password" type="password" placeholder="••••••••" autoComplete="current-password"
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 14 }} />
          </label>
          {state?.error && <p style={{ fontSize: 13, color: "#ff7089", margin: "0 0 12px" }}>{state.error}</p>}
          <button type="submit" disabled={pending}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "#fff", background: "linear-gradient(135deg,#7c5cff,#4f6bff)", opacity: pending ? 0.7 : 1 }}>
            {pending ? "Verifying…" : "Enter console →"}
          </button>
        </form>
        <p style={{ marginTop: 16, textAlign: "center", fontSize: 12.5, color: "#9aa0c0" }}>
          Not an admin? <Link href="/login" style={{ color: "#a9b2ff" }}>Company sign-in</Link>
        </p>
      </div>
    </div>
  );
}
