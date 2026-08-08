"use server";

import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { exitOrg, getOrgContext } from "@/lib/org";
import { logActivity } from "./data-actions";

export async function logout() {
  await destroySession();
  redirect("/login");
}

// A turned-down applicant is otherwise stuck: signed in they only ever see the
// rejection screen, and the proxy bounces them off /signup because they have a
// session. This drops the session and sends them back to the form with their
// email filled in, so they can fix whatever the application got wrong.
export async function reapplyAction() {
  const session = await getSession();
  const email = session?.email ?? "";
  await destroySession();
  redirect(`/signup${email ? `?email=${encodeURIComponent(email)}` : ""}`);
}

// Platform admin steps back out of an org they had entered.
export async function exitOrgAction() {
  const ctx = await getOrgContext();
  if (ctx?.actingOrgId) {
    await logActivity(ctx.actingOrgId, "admin", "exited", "Platform admin left this workspace");
  }
  await exitOrg();
  redirect("/admin");
}
