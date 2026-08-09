"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { sendMail, resetEmail } from "@/lib/mail";
import { isDemoUser } from "@/lib/demo";

export type ForgotResult = { ok?: boolean; error?: string; notice?: string };
export type ResetResult = { error?: string };

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

// Where the reset link should point. Prefers an explicitly configured public URL,
// then the request's own host, so links work in dev and on any deployment.
async function baseUrl(): Promise<string> {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3007";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Step 1 — someone asks for a reset link.
export async function requestReset(_prev: ForgotResult | undefined, formData: FormData): Promise<ForgotResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });

  // Always answer the same way, whether or not the address exists — otherwise
  // this page becomes a way to discover who has an account.
  const sameAnswer: ForgotResult = { ok: true };

  if (!user) return sameAnswer;
  // The demo logins are published on the sign-in page. Anyone could ask for a
  // reset on one; nobody should be able to complete it. Same bland answer, no
  // token issued — the caller can't tell this address is special.
  if (isDemoUser(user.email)) return sameAnswer;

  // Invalidate any earlier outstanding links for this user.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${await baseUrl()}/reset/${token}`;
  const { subject, html, text } = resetEmail(user.name, link);
  const result = await sendMail({ to: user.email, subject, html, text });

  // Be honest when email isn't wired up yet, rather than claiming it was sent.
  if (!result.delivered && result.reason === "not_configured") {
    return { ok: true, notice: "Email isn't set up on this workspace yet, so the link was written to the server log instead. Ask whoever manages the site for it." };
  }
  if (!result.delivered) {
    return { error: "We couldn't send the email just now. Please try again in a minute." };
  }
  return sameAnswer;
}

// Step 2 — the link is opened and a new password is chosen.
export async function resetPassword(_prev: ResetResult | undefined, formData: FormData): Promise<ResetResult> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return { error: "This link has expired or has already been used. Please request a new one." };
  }
  // Belt and braces: even a token minted before the guard above went in, or by
  // some future path, must not be able to move a demo password.
  const target = await prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } });
  if (isDemoUser(target?.email)) {
    return { error: "The demo workspace uses a shared password that can't be changed. Start a free trial for an account of your own." };
  }

  // Mark used and set the password together, so a link can never be replayed.
  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
  ]);
  return {};
}
