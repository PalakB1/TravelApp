"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export type PwResult = { ok?: boolean; error?: string; message?: string };

// Change the signed-in user's own password. Requires the current password.
export async function changePassword(_prev: PwResult | undefined, formData: FormData): Promise<PwResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  const current = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!current || !next || !confirm) return { error: "Please fill in every field." };
  if (next.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (next !== confirm) return { error: "The new passwords don’t match." };
  if (next === current) return { error: "Your new password must be different from the current one." };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: true, message: "Password updated. Use it next time you sign in." };
}
