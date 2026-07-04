"use client";

import { useActionState } from "react";
import { addMember, type MemberResult } from "./actions";

export default function AddMemberForm() {
  const [state, action, pending] = useActionState<MemberResult | undefined, FormData>(addMember, undefined);

  return (
    <form action={action}>
      <div className="row-3">
        <label className="field"><span className="lbl">Name</span><input name="name" placeholder="Full name" /></label>
        <label className="field"><span className="lbl">Email</span><input name="email" type="email" placeholder="them@company.com" autoComplete="off" /></label>
        <label className="field"><span className="lbl">Temporary password</span><input name="password" type="text" placeholder="at least 8 characters" autoComplete="off" /></label>
      </div>
      {state?.error && <p className="small" style={{ color: "var(--danger)", margin: "0 0 10px" }}>{state.error}</p>}
      {state?.ok && <p className="small" style={{ color: "var(--success)", margin: "0 0 10px" }}>✅ {state.message}</p>}
      <button className="primary" type="submit" disabled={pending}>{pending ? "Adding…" : "Add member"}</button>
    </form>
  );
}
