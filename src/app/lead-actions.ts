"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

// Public — the landing hero. Save the email as a lead (so it's not lost even if
// they don't finish), then carry it into signup with the email pre-filled.
export async function captureLead(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (email && /.+@.+\..+/.test(email)) {
    try { await prisma.lead.create({ data: { email, source: "landing" } }); } catch { /* never block the visitor */ }
  }
  redirect(`/signup?email=${encodeURIComponent(email)}`);
}
