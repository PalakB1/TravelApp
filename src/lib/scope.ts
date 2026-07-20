import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/org";

// Access scope for the current request. Everything is already org-scoped; on top
// of that a member can be limited to specific trips (user.tripScoped + TripAccess).
export type Scope = {
  orgId: string;
  userId: string;
  tripIds: string[] | null; // null = every trip in the org
  tripWhere: Record<string, unknown>; // use for prisma.trip.*
  viaTrip: Record<string, unknown>; // use for booking / night / car / visa (through trip)
};

export async function getScope(): Promise<Scope | null> {
  const ctx = await getOrgContext();
  if (!ctx?.orgId) return null;
  const orgId = ctx.orgId;

  // A platform admin (including while inside a client org) is never trip-limited.
  let tripIds: string[] | null = null;
  if (!ctx.isPlatformAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: { tripScoped: true, tripAccess: { select: { tripId: true } } },
    });
    if (user?.tripScoped) tripIds = user.tripAccess.map((a) => a.tripId);
  }

  const tripWhere = tripIds ? { orgId, id: { in: tripIds } } : { orgId };
  return { orgId, userId: ctx.session.userId, tripIds, tripWhere, viaTrip: { trip: tripWhere } };
}

export async function requireScope(): Promise<Scope> {
  const s = await getScope();
  if (!s) redirect("/login");
  return s;
}

// Can this member touch this specific trip?
export async function canUseTrip(scope: Scope, tripId: string): Promise<boolean> {
  if (scope.tripIds && !scope.tripIds.includes(tripId)) return false;
  return !!(await prisma.trip.findFirst({ where: { id: tripId, orgId: scope.orgId }, select: { id: true } }));
}
