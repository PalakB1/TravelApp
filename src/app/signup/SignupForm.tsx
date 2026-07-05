"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState } from "react";
import { signup } from "./actions";

// Public Cloudflare Turnstile site key (safe to ship to the browser).
const TURNSTILE_SITE_KEY = "0x4AAAAAADvpHod-6yzR28OY";

export default function SignupForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState(signup, undefined);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="card" style={{ width: 400, maxWidth: "100%" }}>
        <div className="brand" style={{ paddingLeft: 0 }}>
          <span className="dot">✦</span> Trip Desk
        </div>
        <p className="muted small" style={{ marginTop: -8, marginBottom: 18 }}>
          Create your travel company&apos;s workspace. We&apos;ll review it and switch it on shortly.
        </p>
        <form action={formAction}>
          <label className="field">
            <span className="lbl">Company / agency name</span>
            <input name="company" placeholder="e.g. Nordic Self-Drive Tours" autoComplete="organization" />
          </label>
          <label className="field">
            <span className="lbl">Your name</span>
            <input name="name" placeholder="Full name" autoComplete="name" />
          </label>
          <label className="field">
            <span className="lbl">Email</span>
            <input name="email" type="email" placeholder="you@example.com" autoComplete="username" defaultValue={defaultEmail} autoFocus={!!defaultEmail} />
          </label>
          <label className="field">
            <span className="lbl">Password</span>
            <input name="password" type="password" placeholder="at least 6 characters" autoComplete="new-password" />
          </label>
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} data-theme="auto" style={{ marginBottom: 12 }} />
          {state?.error && (
            <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.error}</p>
          )}
          <button className="primary" type="submit" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
            {pending ? "Creating your workspace…" : "Create workspace"}
          </button>
        </form>
        <p className="muted small" style={{ marginTop: 16, textAlign: "center" }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
