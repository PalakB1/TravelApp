import { getOrgContext } from "@/lib/org";
import { prisma } from "@/lib/db";

// Pure constants + money math live in ./calc (so they're unit-testable).
export * from "./calc";

// Returns the effective orgId only if the current org has the module enabled; else null.
export async function customOrgId(): Promise<string | null> {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) return null;
  const org = await prisma.organization.findUnique({ where: { id: ctx.orgId }, select: { customTripsEnabled: true } });
  return org?.customTripsEnabled ? ctx.orgId : null;
}
