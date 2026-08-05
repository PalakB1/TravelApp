import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// "/" is the public marketing landing. /admin/login is the separate admin door.
// "/forgot" and "/reset" must be public — someone who's locked out can't sign in
// to reach them.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/admin/login", "/pay", "/join", "/visa", "/receipt", "/invoice", "/forgot", "/reset", "/guides"];

// Vercel always exposes a *.vercel.app URL for a project and it can't be removed
// in the dashboard, so the app itself sends those visitors to the real domain.
// Keeps one canonical address for links, search engines and cookies. Preview
// deployments are left alone so they stay testable.
const CANONICAL_HOST = process.env.CANONICAL_HOST || "tripzei.com";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const host = request.headers.get("host") || "";
  const isVercelUrl = host.endsWith(".vercel.app");
  const isPreview = process.env.VERCEL_ENV === "preview";
  if (isVercelUrl && !isPreview && CANONICAL_HOST) {
    const url = new URL(request.url);
    url.host = CANONICAL_HOST;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = request.cookies.get("session")?.value;
  const valid = await verifyToken(token);

  // Logged-in users skip the sign-in / sign-up pages and go to their dashboard.
  if (isPublic) {
    if (valid && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Everything else requires a valid session
  if (!valid) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next internals, API routes, and static assets
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
