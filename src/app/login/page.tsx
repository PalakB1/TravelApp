"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";
import Logo from "@/components/Logo";
import DemoCard from "@/components/DemoCard";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 360, maxWidth: "100%" }}>
        <Link href="/" className="brand" style={{ paddingLeft: 0 }} aria-label="TripZei home">
          <Logo />
        </Link>
        <p className="muted small" style={{ marginTop: -8, marginBottom: 18 }}>
          Sign in to manage your trips and bookings.
        </p>
        <form action={formAction}>
          <label className="field">
            <span className="lbl">Email</span>
            <input name="email" type="email" placeholder="you@example.com" autoComplete="username" />
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
        <Link className="small muted" href="/forgot" style={{ display: "block", textAlign: "center", marginTop: 14 }}>
          Forgot your password?
        </Link>
        <DemoCard />
      </div>
    </div>
  );
}
