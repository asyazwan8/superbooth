import type { Preset, Session, SessionStatus } from "@/lib/schema";

/**
 * Persistence contract.
 *
 * Two drivers implement it: Firestore (production) and a disk-backed local
 * store (development, E2E, and rehearsing a booth before the Firebase project
 * exists). Route handlers only ever see this interface, so swapping drivers
 * cannot change behaviour.
 */

export interface SessionQuery {
  presetId?: string;
  status?: SessionStatus;
  /** Only sessions created at or after this timestamp. */
  since?: number;
  /** Exclude sessions a moderator has hidden. */
  visibleOnly?: boolean;
  /** Only sessions with a finished image — what the gallery wants. */
  completedOnly?: boolean;
  limit?: number;
}

export interface Db {
  readonly name: "firestore" | "local";

  listPresets(): Promise<Preset[]>;
  getPreset(id: string): Promise<Preset | null>;
  getActivePreset(): Promise<Preset | null>;
  savePreset(preset: Preset): Promise<void>;
  deletePreset(id: string): Promise<void>;
  /** Activates one preset and deactivates every other, atomically. */
  setActivePreset(id: string): Promise<void>;

  createSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | null>;
  getSessionByShortId(shortId: string): Promise<Session | null>;
  updateSession(id: string, patch: Partial<Session>): Promise<Session>;
  listSessions(query?: SessionQuery): Promise<Session[]>;
  deleteSession(id: string): Promise<void>;

  /** Sessions whose retention window has passed and that still hold personal data. */
  listPurgeable(now: number, limit: number): Promise<Session[]>;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
