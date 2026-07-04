"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { logActivity } from "../data-actions";

export type MemberResult = { ok?: boolean; error?: string; message?: string };

// Add a new member to the CURRENT org. Equal access — any member can add.
export async function addMember(_prev: MemberResult | undefined, formData: FormData): Promise<MemberResult> {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");
  const orgId = ctx.orgId;

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !password) return { error: "Please fill in name, email and a temporary password." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Someone already uses this email. Pick another." };

  const user = await prisma.user.create({
    data: { orgId, name, email, passwordHash: await bcrypt.hash(password, 10), isPlatformAdmin: false },
  });
  await logActivity(orgId, "team", "added", `Added team member ${user.name} (${user.email})`);
  revalidatePath("/team");
  return { ok: true, message: `${name} can now sign in with that email and password, then change it under Settings.` };
}

// Remove a member from the current org (can't remove yourself).
export async function removeMember(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");
  const orgId = ctx.orgId;
  const id = String(formData.get("id"));
  if (id === ctx.session.userId) return; // never remove yourself

  const member = await prisma.user.findFirst({ where: { id, orgId, isPlatformAdmin: false }, select: { id: true, name: true, email: true } });
  if (!member) return;
  await prisma.user.delete({ where: { id: member.id } });
  await logActivity(orgId, "team", "deleted", `Removed team member ${member.name} (${member.email})`);
  revalidatePath("/team");
}
