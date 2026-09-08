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

/**
 * Whether Firestore and Firebase Auth are usable. All three server credentials
 * must be present, not just two.
 *
 * Checking only the project id and client email used to let a deployment with
 * a missing or unreadable private key render the Firebase sign-in form, accept
 * the password, and only then fail deep inside the Admin SDK as an opaque 500.
 * Treating partial configuration as unconfigured keeps the failure honest.
 */
export const firebaseConfigured = (): boolean =>
  Boolean(
    optional("FIREBASE_PROJECT_ID") &&
      optional("FIREBASE_CLIENT_EMAIL") &&
      optional("FIREBASE_PRIVATE_KEY"),
  );

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

/**
 * Service-account private keys arrive mangled in three predictable ways, and
 * every one of them produces the same unhelpful "Failed to parse private key"
 * from the Admin SDK:
 *
 *   - copied straight out of the JSON file, so wrapped in double quotes;
 *   - pasted with literal backslash-n rather than real newlines;
 *   - pasted into a multi-line editor, so the newlines are already real.
 *
 * All three describe the same key, so all three are accepted here rather than
 * asking an operator to guess which form their host wanted.
 */
export function normalisePrivateKey(raw: string): string {
  let key = raw.trim();

  // Strip a wrapping pair of quotes, which a copy from JSON brings along.
  const quoted = /^(["'])([\s\S]*)\1$/.exec(key);
  if (quoted) key = quoted[2];

  key = key.replace(/\\n/g, "\n");

  if (!key.includes("BEGIN") || !key.includes("PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY does not look like a PEM private key. Copy the whole " +
        "private_key value from the service account JSON, including the " +
        "-----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- lines. See SETUP.md.",
    );
  }

  // A canonical PEM ends with a newline, and the trim above removes one that
  // was already there. Strict parsers reject the key without it.
  return key.endsWith("\n") ? key : `${key}\n`;
}

export const firebaseAdminConfig = () => ({
  projectId: required("FIREBASE_PROJECT_ID"),
  clientEmail: required("FIREBASE_CLIENT_EMAIL"),
  privateKey: normalisePrivateKey(required("FIREBASE_PRIVATE_KEY")),
});
