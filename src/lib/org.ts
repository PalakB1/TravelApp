import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSession, type Session } from "@/lib/auth";

// When the platform admin "enters" an org, we remember it in this cookie so all
// their reads/writes scope to that org until they exit back to the admin console.
const ACTING = "actingOrg";

export type OrgContext = {
  session: Session;
  isPlatformAdmin: boolean;
  actingOrgId: string | null; // set only when the platform admin has entered an org
  orgId: string | null; // the EFFECTIVE org used to scope every query
};

// The context for the current request. Null if not logged in.
export const getOrgContext = cache(async function getOrgContext(): Promise<OrgContext | null> {
  const session = await getSession();
  if (!session) return null;
  const store = await cookies();
  const actingOrgId = session.isPlatformAdmin ? store.get(ACTING)?.value || null : null;
  const orgId = actingOrgId ?? session.orgId;
  return { session, isPlatformAdmin: session.isPlatformAdmin, actingOrgId, orgId };
})

// For scoping queries in pages/actions where an org is guaranteed by the layout gate.
export async function requireOrgId(): Promise<string> {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) throw new Error("No organization in context");
  return ctx.orgId;
}

// Platform admin steps into an org's dashboard.
export async function enterOrg(orgId: string) {
  const store = await cookies();
  store.set(ACTING, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

// Platform admin steps back out to the admin console.
export async function exitOrg() {
  const store = await cookies();
  store.delete(ACTING);
}

// The current organisation, fetched once per request.
//
// The app layout needs its status and plan; the money helper needs its currency
// and tax naming. Those were two separate round trips for the same row on every
// single page. One query, one cache, both callers served.
export const getOrg = cache(async function getOrg() {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) return null;
  return prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: {
      status: true, name: true, customTripsEnabled: true, plan: true, trialEndsAt: true,
      country: true, currency: true, locale: true,
      taxLabel: true, taxLabel2: true, taxRate: true, taxRate2: true, taxIdLabel: true,
    },
  });
});
