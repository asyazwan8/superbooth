import "server-only";

/**
 * Server-side configuration. Nothing here is ever bundled into the client —
 * the FAL key in particular only exists inside route handlers.
 *
 * Every value is read lazily so that a missing credential surfaces as a clear
 * error on the route that needs it, rather than crashing the whole app at
 * import time (which would take the attract screen down too).
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See SETUP.md for the full list.`,
    );
  }
  return value;
}

/** Run FAL against a local stub instead of the real API. See lib/fal/mock.ts. */
export const falMockEnabled = (): boolean =>
  process.env.FAL_MOCK === "1" || process.env.FAL_MOCK === "true";

/** Run Firestore against an in-memory store. Implied by FAL_MOCK for local dev. */
export const firebaseConfigured = (): boolean =>
  Boolean(optional("FIREBASE_PROJECT_ID") && optional("FIREBASE_CLIENT_EMAIL"));

export const falKey = (): string => required("FAL_KEY");

export const adminEmails = (): string[] =>
  (optional("ADMIN_EMAILS") ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

export const attendantPin = (): string => optional("ATTENDANT_PIN") ?? "1234";

export const cronSecret = (): string | undefined => optional("CRON_SECRET");

/**
 * Absolute origin used to build the QR target. Vercel sets VERCEL_PROJECT_
 * PRODUCTION_URL on production deployments; locally we fall back to the dev
 * server. An explicit APP_URL always wins so a custom domain can be used.
 */
export function appUrl(): string {
  const explicit = optional("APP_URL");
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = optional("VERCEL_PROJECT_PRODUCTION_URL") ?? optional("VERCEL_URL");
  if (vercel) return `https://${vercel}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const firebaseAdminConfig = () => ({
  projectId: required("FIREBASE_PROJECT_ID"),
  clientEmail: required("FIREBASE_CLIENT_EMAIL"),
  // Vercel's env editor stores newlines escaped; restore them before use.
  privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
});
