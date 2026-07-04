import { cookies } from "next/headers";
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
export async function getOrgContext(): Promise<OrgContext | null> {
  const session = await getSession();
  if (!session) return null;
  const store = await cookies();
  const actingOrgId = session.isPlatformAdmin ? store.get(ACTING)?.value || null : null;
  const orgId = actingOrgId ?? session.orgId;
  return { session, isPlatformAdmin: session.isPlatformAdmin, actingOrgId, orgId };
}

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
