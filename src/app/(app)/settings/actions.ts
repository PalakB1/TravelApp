"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getOrgContext } from "@/lib/org";
import { isDemoUser } from "@/lib/demo";
import { countryPreset } from "@/lib/countries";
import { parseRate } from "@/lib/money";

export type PwResult = { ok?: boolean; error?: string; message?: string };

const str = (v: FormDataEntryValue | null) => String(v || "").trim() || null;

// Save the org's business / branding / GST details (shown on customer pages).
export async function updateOrgProfile(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) redirect("/login");

  // Logo: new upload → base64; "remove" ticked → null; otherwise leave unchanged.
  let logo: string | null | undefined = undefined;
  const file = formData.get("logo");
  if (file && typeof file === "object" && "arrayBuffer" in file && (file as File).size > 0) {
    const f = file as File;
    if (f.size <= 1_000_000) {
      const buf = Buffer.from(await f.arrayBuffer());
      logo = `data:${f.type || "image/png"};base64,${buf.toString("base64")}`;
    }
  } else if (String(formData.get("removeLogo")) === "yes") {
    logo = null;
  }

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: {
      name: str(formData.get("name")) || undefined,
      legalName: str(formData.get("legalName")),
      gstin: str(formData.get("gstin")),
      gstAddress: str(formData.get("gstAddress")),
      gstState: str(formData.get("gstState")),
      gstStateCode: str(formData.get("gstStateCode")),
      sacCode: str(formData.get("sacCode")) || "998555",
      invoiceNote: str(formData.get("invoiceNote")),
      ...(logo !== undefined ? { logo } : {}),
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// Change the signed-in user's own password. Requires the current password.
export async function changePassword(_prev: PwResult | undefined, formData: FormData): Promise<PwResult> {
  const session = await getSession();
  if (!session) redirect("/login");

  // The demo login is printed on the sign-in page — if a visitor changed it,
  // the next visitor would be locked out and the demo would be dead.
  if (isDemoUser(session.email)) {
    return { error: "This is the shared demo workspace, so its passwords are locked. Start a free trial to get an account of your own." };
  }

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

// Save the org-wide cancellation & refund terms. These auto-fill on every new
// booking (each booking can still override them with its own wording).
export async function updateRefundPolicy(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) redirect("/login");
  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: { defaultRefundPolicy: str(formData.get("defaultRefundPolicy")) },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// Change where the agency operates, and with it the currency it bills in and
// what its taxes are called.
//
// Picking a country reloads every field from that country's preset; the
// individual fields are then editable, because an Indian operator selling
// European tours may well bill in euros, and rates change without the country
// changing. Nothing already recorded is converted — amounts are stored as plain
// numbers, so switching currency re-labels history rather than re-pricing it.
export async function updateRegion(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) redirect("/login");

  const country = String(formData.get("country") || "").trim();
  const preset = countryPreset(country);
  const usePreset = String(formData.get("usePreset") || "") === "yes";

  const pick = (key: string, fallback: string) => (usePreset ? fallback : (str(formData.get(key)) ?? fallback));
  const pickNum = (key: string, fallback: number) => {
    if (usePreset) return fallback;
    const raw = formData.get(key);
    return parseRate(raw, fallback);
  };

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: {
      country: preset.code,
      currency: pick("currency", preset.currency).toUpperCase().slice(0, 3),
      locale: pick("locale", preset.locale),
      taxLabel: pick("taxLabel", preset.taxLabel),
      taxRate: pickNum("taxRate", preset.taxRate),
      // Blank clears the second levy entirely, which is what most countries want.
      taxLabel2: usePreset ? preset.taxLabel2 : (str(formData.get("taxLabel2")) ?? ""),
      taxRate2: pickNum("taxRate2", preset.taxRate2),
      taxIdLabel: pick("taxIdLabel", preset.taxIdLabel),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
