"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { enterOrg } from "@/lib/org";

async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session || !session.isPlatformAdmin) {
    throw new Error("Not authorized");
  }
  return session;
}

async function setOrgStatus(orgId: string, status: "approved" | "rejected" | "suspended" | "pending") {
  await requirePlatformAdmin();
  await prisma.organization.update({ where: { id: orgId }, data: { status } });
  revalidatePath("/admin");
}

export async function approveOrg(formData: FormData) {
  await setOrgStatus(String(formData.get("orgId")), "approved");
}
export async function rejectOrg(formData: FormData) {
  await setOrgStatus(String(formData.get("orgId")), "rejected");
}
export async function suspendOrg(formData: FormData) {
  await setOrgStatus(String(formData.get("orgId")), "suspended");
}

// Step into an org's dashboard to view/help. Scopes all queries to that org
// until the admin exits (see exitOrgAction).
export async function enterOrgAction(formData: FormData) {
  await requirePlatformAdmin();
  const orgId = String(formData.get("orgId"));
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) throw new Error("Organization not found");
  await enterOrg(orgId);
  redirect("/");
}
