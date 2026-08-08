"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { DEMO_EMAIL } from "@/lib/demo";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    isPlatformAdmin: user.isPlatformAdmin,
  });
  redirect("/dashboard");
}

// One-tap entry to the shared demo workspace. No password field to fumble —
// a prospect who has to type credentials from a card is a prospect who leaves.
// Fails soft: if the demo hasn't been seeded, send them to sign up instead.
export async function demoLogin() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) redirect("/signup");

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    isPlatformAdmin: false, // never, whatever the row happens to say
  });
  redirect("/dashboard");
}
