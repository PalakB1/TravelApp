"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

// Verify the Cloudflare Turnstile token server-side. If no secret is configured
// (e.g. local dev without the env var) we skip the check so signup still works.
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

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
  if (!(await verifyTurnstile(String(formData.get("cf-turnstile-response") || "")))) {
    return { error: "Please complete the “I’m human” check and try again." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Try signing in." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const s = (k: string) => String(formData.get(k) || "").trim() || null;

  // New org starts in "pending" — it can't enter the app until an admin approves.
  // Business/GST details are optional here and fully editable later in Settings.
  const org = await prisma.organization.create({
    data: {
      name: company,
      status: "pending",
      legalName: s("legalName"),
      gstin: s("gstin"),
      gstAddress: s("gstAddress"),
      gstState: s("gstState"),
      gstStateCode: s("gstStateCode"),
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
  redirect("/dashboard");
}
