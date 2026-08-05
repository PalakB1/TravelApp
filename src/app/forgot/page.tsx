"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestReset } from "./actions";
import Logo from "@/components/Logo";

export default function ForgotPage() {
  const [state, formAction, pending] = useActionState(requestReset, undefined);

  return (
    <div className="doc-light" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 380, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0 }}>
          <Logo plain />
        </div>

        {state?.ok ? (
          <>
            <h1 style={{ fontSize: 18, marginTop: 6 }}>Check your email</h1>
            <p className="muted small" style={{ marginTop: 8 }}>
              If that address has an account, we&apos;ve sent a link to choose a new password.
              It expires in an hour and works once.
            </p>
            {state.notice && (
              <p className="small" style={{ color: "var(--warning)", background: "var(--warning-bg)", padding: "9px 11px", borderRadius: 9, marginTop: 12 }}>
                {state.notice}
              </p>
            )}
            <Link className="btn sm" href="/login" style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 18, marginTop: 6 }}>Forgot your password?</h1>
            <p className="muted small" style={{ marginTop: 6, marginBottom: 16 }}>
              Enter your email and we&apos;ll send you a link to set a new one.
            </p>
            <form action={formAction}>
              <label className="field">
                <span className="lbl">Email</span>
                <input name="email" type="email" placeholder="you@example.com" autoComplete="username" required />
              </label>
              {state?.error && <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.error}</p>}
              <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
                {pending ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <Link className="small muted" href="/login" style={{ display: "block", textAlign: "center", marginTop: 14 }}>
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
