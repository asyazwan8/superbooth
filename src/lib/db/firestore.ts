import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { firebaseAdminConfig } from "@/lib/env";
import { presetSchema, sessionSchema, type Preset, type Session } from "@/lib/schema";
import { NotFoundError, type Db, type SessionQuery } from "./types";

/**
 * Firestore driver.
 *
 * Every document is parsed through its zod schema on the way out. Firestore is
 * schemaless and these documents are hand-editable in the console, so parsing
 * on read is what stops a mistyped field from reaching the kiosk as `undefined`
 * mid-event.
 */

const PRESETS = "presets";
const SESSIONS = "sessions";

let app: App | undefined;

function db(): Firestore {
  if (!app) {
    app =
      getApps()[0] ??
      initializeApp({ credential: cert(firebaseAdminConfig()) });
  }
  return getFirestore(app);
}

function parsePreset(data: unknown, id: string): Preset {
  return presetSchema.parse({ ...(data as object), id });
}

function parseSession(data: unknown, id: string): Session {
  return sessionSchema.parse({ ...(data as object), id });
}

export const firestoreDb: Db = {
  name: "firestore",

  async listPresets() {
    const snapshot = await db().collection(PRESETS).orderBy("updatedAt", "desc").get();
    return snapshot.docs.map((doc) => parsePreset(doc.data(), doc.id));
  },

  async getPreset(id) {
    const doc = await db().collection(PRESETS).doc(id).get();
    return doc.exists ? parsePreset(doc.data(), doc.id) : null;
  },

  async getActivePreset() {
    const snapshot = await db()
      .collection(PRESETS)
      .where("isActive", "==", true)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? parsePreset(doc.data(), doc.id) : null;
  },

  async savePreset(preset) {
    const validated = presetSchema.parse(preset);
    await db().collection(PRESETS).doc(validated.id).set(validated);
  },

  async deletePreset(id) {
    await db().collection(PRESETS).doc(id).delete();
  },

  async setActivePreset(id) {
    const client = db();
    await client.runTransaction(async (transaction) => {
      const target = client.collection(PRESETS).doc(id);
      if (!(await transaction.get(target)).exists) {
        throw new NotFoundError(`Preset ${id}`);
      }
      // Read the currently-live presets inside the transaction so two operators
      // flipping the live preset at once cannot leave two marked active.
      const live = await transaction.get(
        client.collection(PRESETS).where("isActive", "==", true),
      );
      for (const doc of live.docs) {
        if (doc.id !== id) transaction.update(doc.ref, { isActive: false });
      }
      transaction.update(target, { isActive: true, updatedAt: Date.now() });
    });
  },

  async createSession(session) {
    const validated = sessionSchema.parse(session);
    await db().collection(SESSIONS).doc(validated.id).set(validated);
  },

  async getSession(id) {
    const doc = await db().collection(SESSIONS).doc(id).get();
    return doc.exists ? parseSession(doc.data(), doc.id) : null;
  },

  async getSessionByShortId(shortId) {
    const snapshot = await db()
      .collection(SESSIONS)
      .where("shortId", "==", shortId)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    return doc ? parseSession(doc.data(), doc.id) : null;
  },

  async updateSession(id, patch) {
    const client = db();
    const ref = client.collection(SESSIONS).doc(id);
    return client.runTransaction(async (transaction) => {
      const doc = await transaction.get(ref);
      if (!doc.exists) throw new NotFoundError(`Session ${id}`);
      const existing = parseSession(doc.data(), id);
      const merged = sessionSchema.parse({
        ...existing,
        ...patch,
        timings: { ...existing.timings, ...(patch.timings ?? {}) },
      });
      transaction.set(ref, merged);
      return merged;
    });
  },

  async listSessions(query: SessionQuery = {}) {
    let ref = db().collection(SESSIONS).orderBy("createdAt", "desc") as FirebaseFirestore.Query;
    if (query.presetId) ref = ref.where("presetId", "==", query.presetId);
    if (query.status) ref = ref.where("status", "==", query.status);
    if (query.since !== undefined) ref = ref.where("createdAt", ">=", query.since);
    if (query.visibleOnly) ref = ref.where("hidden", "==", false);

    const snapshot = await ref.limit(query.limit ?? 200).get();
    const sessions = snapshot.docs.map((doc) => parseSession(doc.data(), doc.id));
    // `completedOnly` is applied in memory: adding it to the query would need
    // another composite index for what is always a small, already-bounded page.
    return query.completedOnly ? sessions.filter((session) => session.finalUrl) : sessions;
  },

  async deleteSession(id) {
    await db().collection(SESSIONS).doc(id).delete();
  },

  async listPurgeable(now, limit) {
    const snapshot = await db()
      .collection(SESSIONS)
      .where("purgedAt", "==", null)
      .where("expiresAt", "<=", now)
      .orderBy("expiresAt", "asc")
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => parseSession(doc.data(), doc.id));
  },
};
