"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Browser-side Firebase, used for one thing only: signing an operator in so we
 * can trade their ID token for a server session cookie.
 *
 * These NEXT_PUBLIC values are not secrets — Firebase expects them in client
 * code, and access is controlled by the admin allowlist and the deny-all
 * Firestore rules, not by hiding the project id.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export function firebaseAuth(): Auth {
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new Error(
      "Firebase web config is missing. Set NEXT_PUBLIC_FIREBASE_API_KEY, " +
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN and NEXT_PUBLIC_FIREBASE_PROJECT_ID.",
    );
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
