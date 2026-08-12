import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, signSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth";
import { DEMO_EMAIL, isDemoUser } from "@/lib/demo";

export const dynamic = "force-dynamic";

// tripzei.com/demo — one link, straight into a loaded workspace.
//
// This is a Route Handler and not a page for a hard reason: signing someone in
// means writing a cookie, and Next.js only permits that from a Server Action or
// a Route Handler. The first version of this was a page that called the login
// action while rendering, which threw on every request.
//
// The cookie is set on the response object rather than through the cookies()
// store, so it can't be dropped on the way out of a redirect.
export async function GET(request: Request) {
  const session = await getSession();

  // Already someone else's session — ask before replacing it. Silently swapping
  // a working operator into a fake workspace mid-shift would be alarming.
  if (session && !isDemoUser(session.email)) {
    return NextResponse.redirect(new URL("/demo/switch", request.url));
  }
  if (session) return NextResponse.redirect(new URL("/dashboard", request.url));

  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  // Demo not seeded (a fresh environment) — send them somewhere useful.
  if (!user) return NextResponse.redirect(new URL("/signup", request.url));

  const token = await signSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    isPlatformAdmin: false, // never, whatever the row happens to say
  });

  const res = NextResponse.redirect(new URL("/dashboard", request.url));
  res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTS);
  return res;
}
