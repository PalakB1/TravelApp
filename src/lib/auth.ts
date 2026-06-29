import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-insecure-secret-change-me"
);

export type Session = { userId: string; email: string; name: string };

export async function createSession(user: Session) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { userId: String(payload.userId), email: String(payload.email), name: String(payload.name) };
  } catch {
    return null;
  }
}

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
