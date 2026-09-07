import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { presetSchema, sessionSchema, type Preset, type Session } from "@/lib/schema";
import { defaultPreset } from "./seed";
import { NotFoundError, type Db, type SessionQuery } from "./types";

/**
 * Disk-backed store used when Firebase credentials are absent.
 *
 * This exists so the booth is fully runnable — and E2E testable — before a
 * Firebase project has been created. It is deliberately simple: a single JSON
 * document, rewritten atomically, guarded by a promise chain so concurrent
 * route handlers cannot interleave a read-modify-write.
 *
 * It is not for production: there is no multi-instance coordination, and
 * Vercel's filesystem is ephemeral. `getDb()` picks Firestore whenever
 * credentials exist.
 */

const FILE = path.join(process.cwd(), ".superbooth-mock", "db.json");

interface Snapshot {
  presets: Record<string, Preset>;
  sessions: Record<string, Session>;
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialise every mutation so read-modify-write cycles cannot interleave. */
function exclusive<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation, operation);
  queue = result.catch(() => undefined);
  return result;
}

async function read(): Promise<Snapshot> {
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as Snapshot;
    return { presets: raw.presets ?? {}, sessions: raw.sessions ?? {} };
  } catch {
    const preset = defaultPreset();
    return { presets: { [preset.id]: preset }, sessions: {} };
  }
}

async function write(snapshot: Snapshot): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true });
  // Write-then-rename so a crash mid-write cannot leave a truncated database.
  const temporary = `${FILE}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(snapshot, null, 2), "utf8");
  await rename(temporary, FILE);
}

function matches(session: Session, query: SessionQuery): boolean {
  if (query.presetId && session.presetId !== query.presetId) return false;
  if (query.status && session.status !== query.status) return false;
  if (query.since !== undefined && session.createdAt < query.since) return false;
  if (query.visibleOnly && session.hidden) return false;
  if (query.completedOnly && !session.finalUrl) return false;
  return true;
}

export const localDb: Db = {
  name: "local",

  async listPresets() {
    const { presets } = await read();
    return Object.values(presets).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  async getPreset(id) {
    const { presets } = await read();
    return presets[id] ?? null;
  },

  async getActivePreset() {
    const { presets } = await read();
    return Object.values(presets).find((preset) => preset.isActive) ?? null;
  },

  async savePreset(preset) {
    await exclusive(async () => {
      const snapshot = await read();
      snapshot.presets[preset.id] = presetSchema.parse(preset);
      await write(snapshot);
    });
  },

  async deletePreset(id) {
    await exclusive(async () => {
      const snapshot = await read();
      delete snapshot.presets[id];
      await write(snapshot);
    });
  },

  async setActivePreset(id) {
    await exclusive(async () => {
      const snapshot = await read();
      if (!snapshot.presets[id]) throw new NotFoundError(`Preset ${id}`);
      for (const preset of Object.values(snapshot.presets)) {
        preset.isActive = preset.id === id;
      }
      await write(snapshot);
    });
  },

  async createSession(session) {
    await exclusive(async () => {
      const snapshot = await read();
      snapshot.sessions[session.id] = sessionSchema.parse(session);
      await write(snapshot);
    });
  },

  async getSession(id) {
    const { sessions } = await read();
    return sessions[id] ?? null;
  },

  async getSessionByShortId(shortId) {
    const { sessions } = await read();
    return Object.values(sessions).find((session) => session.shortId === shortId) ?? null;
  },

  async updateSession(id, patch) {
    return exclusive(async () => {
      const snapshot = await read();
      const existing = snapshot.sessions[id];
      if (!existing) throw new NotFoundError(`Session ${id}`);
      const merged = sessionSchema.parse({
        ...existing,
        ...patch,
        timings: { ...existing.timings, ...(patch.timings ?? {}) },
      });
      snapshot.sessions[id] = merged;
      await write(snapshot);
      return merged;
    });
  },

  async listSessions(query = {}) {
    const { sessions } = await read();
    return Object.values(sessions)
      .filter((session) => matches(session, query))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, query.limit ?? 200);
  },

  async deleteSession(id) {
    await exclusive(async () => {
      const snapshot = await read();
      delete snapshot.sessions[id];
      await write(snapshot);
    });
  },

  async listPurgeable(now, limit) {
    const { sessions } = await read();
    return Object.values(sessions)
      .filter(
        (session) =>
          session.expiresAt !== null && session.expiresAt <= now && session.purgedAt === null,
      )
      .slice(0, limit);
  },
};
