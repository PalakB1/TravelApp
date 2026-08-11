"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { trialEndDate } from "@/lib/billing";
import { countryPreset } from "@/lib/countries";

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

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { org: { select: { id: true, status: true } } },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const s = (k: string) => String(formData.get(k) || "").trim() || null;
  // On a re-application, blank optional fields mean "unchanged" rather than
  // "clear it" — undefined tells Prisma to leave the column alone.
  const keep = (k: string) => s(k) ?? undefined;

  if (existing) {
    const status = existing.org?.status;

    // Turned down before? Let them apply again with the same email. A rejection
    // is a decision about one application, not a life sentence for the address —
    // and the alternative is telling a returning prospect to go away.
    if (status === "rejected" && existing.orgId && existing.isOrgAdmin) {
      await prisma.$transaction([
        prisma.organization.update({
          where: { id: existing.orgId },
          data: {
            name: company,
            status: "pending",
            plan: "trial",
            trialEndsAt: trialEndDate(),
            legalName: keep("legalName"),
            gstin: keep("gstin"),
            gstAddress: keep("gstAddress"),
            gstState: keep("gstState"),
            gstStateCode: keep("gstStateCode"),
          },
        }),
        // Whatever they typed this time wins — including a new password, since
        // they've proved nothing about the old one but did just pass Turnstile.
        prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } }),
      ]);

      await createSession({
        userId: existing.id,
        email: existing.email,
        name,
        orgId: existing.orgId,
        isPlatformAdmin: false,
      });
      redirect("/dashboard");
    }

    // Every other state has a better route than starting over.
    return {
      error:
        status === "pending"
          ? "You've already applied with this email — we're reviewing it. You'll be able to sign in as soon as it's approved."
          : status === "suspended"
            ? "This workspace is paused. Please get in touch with us to reactivate it."
            : "An account with this email already exists. Try signing in.",
    };
  }

  // New org starts in "pending" — it can't enter the app until an admin approves.
  // Business/GST details are optional here and fully editable later in Settings.
  // The country decides currency, digit grouping and tax naming in one go, so
  // a UK agency never sees the word GST and an Indian one keeps TCS.
  const preset = countryPreset(String(formData.get("country") || ""));

  const org = await prisma.organization.create({
    data: {
      name: company,
      status: "pending",
      country: preset.code,
      currency: preset.currency,
      locale: preset.locale,
      taxLabel: preset.taxLabel,
      taxRate: preset.taxRate,
      taxLabel2: preset.taxLabel2,
      taxRate2: preset.taxRate2,
      taxIdLabel: preset.taxIdLabel,
      plan: "trial",
      trialEndsAt: trialEndDate(),
      legalName: s("legalName"),
      gstin: s("gstin"),
      gstAddress: s("gstAddress"),
      gstState: s("gstState"),
      gstStateCode: s("gstStateCode"),
      // Whoever signs the company up runs it — they can invite colleagues and
      // promote others from the Team page.
      users: { create: { name, email, passwordHash, isOrgAdmin: true } },
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
