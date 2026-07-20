"use client";

import { useActionState } from "react";
import { resetMemberPassword, type MemberResult } from "./actions";

export default function ResetPasswordForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<MemberResult | undefined, FormData>(resetMemberPassword, undefined);
  return (
    <details className="menu-pop" style={{ position: "relative" }}>
      <summary className="sm" style={{ listStyle: "none", cursor: "pointer" }}>Reset password</summary>
      <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", width: 280, maxWidth: "80vw", zIndex: 30, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 12px 32px rgba(27,28,43,0.16)", padding: 14, textAlign: "left" }}>
        {state?.ok ? (
          <p className="small" style={{ color: "var(--success)", margin: 0 }}>✅ {state.message}</p>
        ) : (
          <form action={action}>
            <input type="hidden" name="id" value={id} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>Reset {name.split(" ")[0]}’s password</div>
            <p className="small muted" style={{ margin: "0 0 8px" }}>Set a temporary password and share it with them — they change it under Settings.</p>
            <label className="field"><span className="lbl">Temporary password</span><input name="password" type="text" placeholder="at least 8 characters" autoComplete="off" /></label>
            {state?.error && <p className="small" style={{ color: "var(--danger)", margin: "0 0 8px" }}>{state.error}</p>}
            <button className="primary sm" type="submit" disabled={pending}>{pending ? "Resetting…" : "Set new password"}</button>
          </form>
        )}
      </div>
    </details>
  );
}
