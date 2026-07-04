"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth";
import { exitOrg } from "@/lib/org";

export async function logout() {
  await destroySession();
  redirect("/login");
}

// Platform admin steps back out of an org they had entered.
export async function exitOrgAction() {
  await exitOrg();
  redirect("/admin");
}
