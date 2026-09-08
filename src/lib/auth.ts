import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { adminEmails, attendantPin, firebaseConfigured } from "@/lib/env";
import { HttpError, forbidden, unauthorized } from "@/lib/api";

/**
 * Admin authentication.
 *
 * Production uses Firebase Auth: the browser signs in, hands us the ID token
 * once, and we exchange it for an httpOnly session cookie so server components
 * can authenticate without shipping a token to the client on every render.
 * Only allowlisted email addresses get a cookie at all.
 *
 * When no Firebase project is configured the backend falls back to the
 * attendant PIN — but *only* outside production, so a real deployment can
 * never accidentally end up guarded by a four-digit code.
 */

export const SESSION_COOKIE = "sb_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 12;

export interface AdminIdentity {
  email: string;
  /** How this session was authenticated, surfaced in the admin UI. */
  via: "firebase" | "pin";
}

export function pinFallbackAllowed(): boolean {
  return !firebaseConfigured() && process.env.NODE_ENV !== "production";
}

/* ------------------------------------------------------------------ */
/* Local (PIN) sessions                                                */
/* ------------------------------------------------------------------ */

function localSecret(): string {
  return `superbooth-local-admin:${attendantPin()}`;
}

function signLocalToken(issuedAt: number): string {
  const payload = String(issuedAt);
  const signature = createHmac("sha256", localSecret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function verifyLocalToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = createHmac("sha256", localSecret()).update(payload).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const issuedAt = Number(payload);
  return Number.isFinite(issuedAt) && Date.now() - issuedAt < SESSION_MAX_AGE_SEC * 1000;
}

/* ------------------------------------------------------------------ */
/* Firebase sessions                                                   */
/* ------------------------------------------------------------------ */

/** Matches import-time failures, as opposed to a rejected service account. */
const MODULE_LOAD_FAILURE = /ERR_REQUIRE_ESM|Failed to load external module|Cannot find module/i;

async function firebaseAuth() {
  try {
    /*
     * These imports are inside the try on purpose. firebase-admin reaches jose
     * through jwks-rsa, and that chain has already broken once at import time
     * on a serverless runtime. With the imports outside the try that arrived as
     * a bare "Something went wrong", which is the failure hardest to diagnose
     * from a login screen.
     */
    const { cert, getApps, initializeApp } = await import("firebase-admin/app");
    const { getAuth } = await import("firebase-admin/auth");
    const { firebaseAdminConfig } = await import("@/lib/env");

    const app = getApps()[0] ?? initializeApp({ credential: cert(firebaseAdminConfig()) });
    return getAuth(app);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);

    // The running Node version is named because it is the answer whenever the
    // module graph is what failed, and it cannot be read from a login screen.
    if (MODULE_LOAD_FAILURE.test(detail)) {
      throw new HttpError(
        500,
        `Firebase Admin failed to load (Node ${process.version}). This is a ` +
          "dependency packaging problem, not a credentials one: check that the " +
          "jose override in package.json survived the last install. " +
          `Underlying error: ${detail}`,
      );
    }

    /*
     * Anything else here is a bad service account. This route is operator-only,
     * so naming the failing variable is safe, and is the difference between a
     * five-minute fix and an afternoon.
     */
    throw new HttpError(
      500,
      `Firebase admin credentials were rejected: ${detail} ` +
        "Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY " +
        "in your deployment's environment variables. See SETUP.md.",
    );
  }
}

export function isAllowlisted(email: string | undefined): boolean {
  if (!email) return false;
  const allowed = adminEmails();
  // An empty allowlist locks everyone out rather than letting everyone in:
  // failing closed is the only safe default for a public deployment.
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}

/** Exchange a Firebase ID token for a session cookie value. */
export async function createFirebaseSession(idToken: string): Promise<string> {
  const auth = await firebaseAuth();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (cause) {
    // The usual cause is the browser signing in against a different Firebase
    // project than the server verifies against — NEXT_PUBLIC_FIREBASE_PROJECT_ID
    // and FIREBASE_PROJECT_ID disagreeing. The SDK calls that "incorrect
    // audience", which tells an operator nothing.
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new HttpError(
      500,
      `Could not verify the sign-in token: ${detail} ` +
        "Confirm NEXT_PUBLIC_FIREBASE_PROJECT_ID matches FIREBASE_PROJECT_ID.",
    );
  }

  if (!isAllowlisted(decoded.email)) {
    throw forbidden("This account is not on the admin allowlist.");
  }
  return auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SEC * 1000 });
}

/** Issue a session for a correct attendant PIN. Development only. */
export function createLocalSession(pin: string): string {
  if (!pinFallbackAllowed()) {
    throw forbidden("PIN sign-in is disabled. Configure Firebase Auth.");
  }
  const a = Buffer.from(pin);
  const b = Buffer.from(attendantPin());
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw forbidden("Incorrect PIN.");
  }
  return signLocalToken(Date.now());
}

/* ------------------------------------------------------------------ */
/* Reading the current session                                         */
/* ------------------------------------------------------------------ */

export async function setSessionCookie(value: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in admin, or null. Safe to call from server components. */
export async function currentAdmin(): Promise<AdminIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  if (firebaseConfigured()) {
    try {
      const auth = await firebaseAuth();
      const decoded = await auth.verifySessionCookie(token, true);
      if (!isAllowlisted(decoded.email)) return null;
      return { email: decoded.email as string, via: "firebase" };
    } catch {
      return null;
    }
  }

  if (pinFallbackAllowed() && verifyLocalToken(token)) {
    return { email: "attendant (local)", via: "pin" };
  }
  return null;
}

/** Same, but throws a 401 — for use inside API route handlers. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await currentAdmin();
  if (!admin) throw unauthorized("Sign in to continue.");
  return admin;
}
