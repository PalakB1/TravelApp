import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// TEMPORARY (and note: an underscore-prefixed folder is private in the App
// Router, so this cannot be called _perf or it simply never becomes a route).
// Reports where a request's time actually goes, measured inside the
// running function rather than inferred from outside. Delete once the slowness
// is understood — it is signed-in only, but it is still a diagnostic and has no
// business living in the app.
export async function GET() {
  const t0 = Date.now();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const tAuth = Date.now();

  // First DB call on this instance — includes connecting if it isn't connected.
  await prisma.$queryRawUnsafe("SELECT 1");
  const tFirst = Date.now();

  // Subsequent calls on an established connection.
  const each: number[] = [];
  for (let i = 0; i < 5; i++) {
    const s = Date.now();
    await prisma.$queryRawUnsafe("SELECT 1");
    each.push(Date.now() - s);
  }
  const tPing = Date.now();

  // Something representative of a real page.
  const s2 = Date.now();
  await prisma.booking.count();
  const realQuery = Date.now() - s2;

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? "unknown",
    instanceUptimeSec: Math.round(process.uptime()),
    authMs: tAuth - t0,
    firstQueryMs: tFirst - tAuth,
    pingMs: each,
    pingAvgMs: Math.round(each.reduce((a, b) => a + b, 0) / each.length),
    realQueryMs: realQuery,
    totalMs: Date.now() - t0,
  });
}
