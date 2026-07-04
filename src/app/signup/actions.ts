"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function signup(_prev: { error?: string } | undefined, formData: FormData) {
  const company = String(formData.get("company") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!company || !name || !email || !password) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // New org starts in "pending" — it can't enter the app until an admin approves.
  const org = await prisma.organization.create({
    data: {
      name: company,
      status: "pending",
      users: { create: { name, email, passwordHash } },
    },
    include: { users: true },
  });
  const user = org.users[0];

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: org.id,
    isPlatformAdmin: false,
  });
  redirect("/");
}
