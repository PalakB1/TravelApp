"use client";

import { useActionState } from "react";
import { changePassword, type PwResult } from "./actions";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PwResult | undefined, FormData>(changePassword, undefined);

  if (state?.ok) {
    return (
      <div className="empty-cta" style={{ borderColor: "var(--success)" }}>
        <span className="emoji">✅</span>
        <div className="t">Password changed</div>
        <div className="d">{state.message}</div>
      </div>
    );
  }

  return (
    <form action={action} style={{ maxWidth: 380 }}>
      <label className="field"><span className="lbl">Current password</span>
        <input name="current" type="password" autoComplete="current-password" placeholder="••••••••" />
      </label>
      <label className="field"><span className="lbl">New password</span>
        <input name="next" type="password" autoComplete="new-password" placeholder="at least 8 characters" />
      </label>
      <label className="field"><span className="lbl">Confirm new password</span>
        <input name="confirm" type="password" autoComplete="new-password" placeholder="re-type it" />
      </label>
      {state?.error && <p className="small" style={{ color: "var(--danger)", margin: "0 0 12px" }}>{state.error}</p>}
      <button className="primary" type="submit" disabled={pending} style={{ justifyContent: "center" }}>
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
