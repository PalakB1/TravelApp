"use client";

import Link from "next/link";
import { use } from "react";
import { useActionState } from "react";
import { resetPassword } from "@/app/forgot/actions";
import Logo from "@/components/Logo";

export default function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, formAction, pending] = useActionState(resetPassword, undefined);
  // An empty result object (no error) means the password was changed.
  const done = state !== undefined && !state.error;

  return (
    <div className="doc-light" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div className="card" style={{ width: 380, maxWidth: "100%" }}>
        <Link href="/" className="brand" style={{ paddingLeft: 0 }} aria-label="TripZei home">
          <Logo plain />
        </Link>

        {done ? (
          <>
            <h1 style={{ fontSize: 18, marginTop: 6 }}>Password changed ✓</h1>
            <p className="muted small" style={{ marginTop: 8 }}>You can sign in with your new password now.</p>
            <Link className="btn primary sm" href="/login" style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>Go to sign in</Link>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 18, marginTop: 6 }}>Choose a new password</h1>
            <p className="muted small" style={{ marginTop: 6, marginBottom: 16 }}>At least 8 characters. Make it one you don&apos;t use elsewhere.</p>
            <form action={formAction}>
              <input type="hidden" name="token" value={token} />
              <label className="field">
                <span className="lbl">New password</span>
                <input name="password" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
              </label>
              <label className="field">
                <span className="lbl">Confirm new password</span>
                <input name="confirm" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={8} />
              </label>
              {state?.error && <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.error}</p>}
              <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
                {pending ? "Saving…" : "Set new password"}
              </button>
            </form>
            <Link className="small muted" href="/forgot" style={{ display: "block", textAlign: "center", marginTop: 14 }}>
              Request a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
