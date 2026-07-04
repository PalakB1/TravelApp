import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// "/" is the public marketing landing. /admin/login is the separate admin door.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/admin/login", "/pay", "/join", "/visa"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
