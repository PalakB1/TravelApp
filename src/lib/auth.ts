import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
);

export type Session = {
  userId: string;
  email: string;
  name: string;
  orgId: string | null;
  isPlatformAdmin: boolean;
};

export const SESSION_COOKIE = COOKIE;

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/** The signed token on its own — for callers that set the cookie themselves. */
export async function signSession(user: Session): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

// Only valid inside a Server Action or a Route Handler — Next.js throws if a
// page render tries to write a cookie. A route handler that builds its own
// Response should use signSession + SESSION_COOKIE_OPTS instead.
export async function createSession(user: Session) {
  const token = await signSession(user);
  const store = await cookies();
  store.set(COOKIE, token, SESSION_COOKIE_OPTS);
}

// Wrapped in cache(): the layout, the scope helper and the money helper all ask
// for the session on the same request, and verifying the JWT three times is work
// nobody asked for. cache() de-duplicates within a single request only.
export const getSession = cache(async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name),
      orgId: payload.orgId ? String(payload.orgId) : null,
      isPlatformAdmin: Boolean(payload.isPlatformAdmin),
    };
  } catch {
    return null;
  }
})

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

// Used by proxy.ts (edge) — just checks the token is valid.
export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
