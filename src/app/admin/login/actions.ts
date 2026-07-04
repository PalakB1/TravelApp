"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

// Dedicated platform-admin sign-in. Only accounts flagged isPlatformAdmin get in;
// on success we land straight in the /admin console.
export async function adminLogin(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }
  if (!user.isPlatformAdmin) {
    return { error: "This account isn’t a platform admin. Use the normal sign-in." };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    isPlatformAdmin: true,
  });
  redirect("/admin");
}
