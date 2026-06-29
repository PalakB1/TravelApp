"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 360, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0 }}>
          <span className="dot">✦</span> Trip Desk
        </div>
        <p className="muted small" style={{ marginTop: -8, marginBottom: 18 }}>
          Sign in to manage your trips and bookings.
        </p>
        <form action={formAction}>
          <label className="field">
            <span className="lbl">Email</span>
            <input name="email" type="email" placeholder="admin@travel.local" autoComplete="username" defaultValue="admin@travel.local" />
          </label>
          <label className="field">
            <span className="lbl">Password</span>
            <input name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
          </label>
          {state?.error && (
            <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.error}</p>
          )}
          <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="small muted" style={{ marginTop: 14, textAlign: "center" }}>
          Demo login: admin@travel.local / travel123
        </p>
      </div>
    </div>
  );
}
