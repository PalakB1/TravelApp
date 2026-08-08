"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";
import { logActivity } from "../data-actions";
import { isDemoUser } from "@/lib/demo";

export type MemberResult = { ok?: boolean; error?: string; message?: string };

// Managing the team is admin-only. A company admin runs their own workspace; the
// platform admin (us) can act anywhere. Returns the org id, or null if refused.
async function requireOrgAdmin(): Promise<{ orgId: string; userId: string } | null> {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");
  const userId = ctx.session.userId;
  if (ctx.isPlatformAdmin) return { orgId: ctx.orgId, userId };
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { isOrgAdmin: true } });
  return me?.isOrgAdmin ? { orgId: ctx.orgId, userId } : null;
}

// Promote a colleague to admin, or step them back down. Admins can invite,
// remove, set trip access and reset passwords.
export async function setOrgAdmin(formData: FormData) {
  const allowed = await requireOrgAdmin();
  if (!allowed) { revalidatePath("/team"); return; }
  const { orgId } = allowed;
  const id = String(formData.get("id"));
  const makeAdmin = String(formData.get("makeAdmin")) === "1";

  const target = await prisma.user.findFirst({ where: { id, orgId }, select: { id: true, name: true, isOrgAdmin: true } });
  if (!target) { revalidatePath("/team"); return; }

  // Never leave a workspace with no one who can manage it.
  if (!makeAdmin) {
    // Platform admins don't count — a workspace must keep one of its OWN admins,
    // otherwise the agency would depend on us to manage their team.
    const admins = await prisma.user.count({ where: { orgId, isOrgAdmin: true, isPlatformAdmin: false } });
    if (admins <= 1 && target.isOrgAdmin) { revalidatePath("/team"); return; }
  }

  await prisma.user.update({ where: { id }, data: { isOrgAdmin: makeAdmin } });
  await logActivity(orgId, "team", "updated", `${makeAdmin ? "Made" : "Removed"} ${target.name} ${makeAdmin ? "an admin" : "as admin"}`);
  revalidatePath("/team");
}

// Add a new member to the CURRENT org. Admins only.
export async function addMember(_prev: MemberResult | undefined, formData: FormData): Promise<MemberResult> {
  const allowed = await requireOrgAdmin();
  if (!allowed) return { error: "Only an admin can add team members." };
  const { orgId } = allowed;

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

// Give a member access to all trips, or only to specific ones.
export async function setTripAccess(formData: FormData) {
  const allowed = await requireOrgAdmin();
  if (!allowed) { revalidatePath("/team"); return; }
  const { orgId } = allowed;
  const userId = String(formData.get("userId"));
  const scoped = String(formData.get("scoped")) === "limited";

  const member = await prisma.user.findFirst({ where: { id: userId, orgId, isPlatformAdmin: false }, select: { id: true, name: true } });
  if (!member) return;

  // Only trips that actually belong to this org can be granted.
  const wanted = formData.getAll("tripIds").map(String);
  const valid = scoped && wanted.length
    ? await prisma.trip.findMany({ where: { orgId, id: { in: wanted } }, select: { id: true } })
    : [];

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { tripScoped: scoped } }),
    prisma.tripAccess.deleteMany({ where: { userId } }),
    ...(valid.length ? [prisma.tripAccess.createMany({ data: valid.map((t) => ({ userId, tripId: t.id })) })] : []),
  ]);

  await logActivity(orgId, "team", "updated", scoped ? `Limited ${member.name} to ${valid.length} trip${valid.length === 1 ? "" : "s"}` : `Gave ${member.name} access to all trips`);
  revalidatePath("/team");
  revalidatePath("/", "layout");
}

// Reset a teammate's password (for when they're locked out). Any org member can
// do this for another member; they set a temporary password to hand over.
export async function resetMemberPassword(_prev: MemberResult | undefined, formData: FormData): Promise<MemberResult> {
  const allowed = await requireOrgAdmin();
  if (!allowed) return { error: "Only an admin can reset a colleague's password." };
  const { orgId } = allowed;
  const id = String(formData.get("id"));
  const password = String(formData.get("password") || "");
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const member = await prisma.user.findFirst({ where: { id, orgId, isPlatformAdmin: false }, select: { id: true, name: true, email: true } });
  if (!member) return { error: "That member isn’t in this workspace." };
  // Same reason as Settings: the demo's logins are public and must keep working.
  if (isDemoUser(member.email)) return { error: "This is the shared demo workspace, so its passwords are locked. Start a free trial to get an account of your own." };

  await prisma.user.update({ where: { id: member.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await logActivity(orgId, "team", "updated", `Reset password for ${member.name} (${member.email})`);
  revalidatePath("/team");
  return { ok: true, message: `${member.name} can now sign in with that password — ask them to change it under Settings.` };
}

// Remove a member from the current org (can't remove yourself).
export async function removeMember(formData: FormData) {
  const allowed = await requireOrgAdmin();
  if (!allowed) { revalidatePath("/team"); return; }
  const { orgId, userId } = allowed;
  const id = String(formData.get("id"));
  if (id === userId) return; // never remove yourself

  const member = await prisma.user.findFirst({ where: { id, orgId, isPlatformAdmin: false }, select: { id: true, name: true, email: true } });
  if (!member) return;
  if (isDemoUser(member.email)) return; // deleting a demo login would end the demo
  await prisma.user.delete({ where: { id: member.id } });
  await logActivity(orgId, "team", "deleted", `Removed team member ${member.name} (${member.email})`);
  revalidatePath("/team");
}
