import { badRequest, handle, ok, readJson } from "@/lib/api";
import {
  clearSessionCookie,
  createFirebaseSession,
  createLocalSession,
  pinFallbackAllowed,
  setSessionCookie,
} from "@/lib/auth";
import { firebaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Sign in. Accepts a Firebase ID token in production, or the attendant PIN
 * when running locally without a Firebase project.
 *
 * Either way the result is the same httpOnly cookie, so nothing downstream —
 * server components included — has to know which route was taken.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = (await readJson(request)) as { idToken?: unknown; pin?: unknown };

    if (firebaseConfigured()) {
      if (typeof body.idToken !== "string") throw badRequest("An ID token is required.");
      await setSessionCookie(await createFirebaseSession(body.idToken));
      return ok({ ok: true, via: "firebase" });
    }

    if (!pinFallbackAllowed()) {
      throw badRequest("Firebase Auth is not configured. See SETUP.md.");
    }
    if (typeof body.pin !== "string") throw badRequest("A PIN is required.");
    await setSessionCookie(createLocalSession(body.pin));
    return ok({ ok: true, via: "pin" });
  });
}

export async function DELETE() {
  return handle(async () => {
    await clearSessionCookie();
    return ok({ ok: true });
  });
}
