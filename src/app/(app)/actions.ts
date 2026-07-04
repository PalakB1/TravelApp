"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { exitOrg, getOrgContext } from "@/lib/org";
import { logActivity } from "./data-actions";

export async function logout() {
  await destroySession();
  redirect("/login");
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
