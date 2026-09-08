import "server-only";
import { firebaseConfigured } from "@/lib/env";
import { presetSchema, type Preset, type PublicPreset } from "@/lib/schema";
import { defaultPreset } from "./seed";
import type { Db } from "./types";

let cached: Db | null = null;

/**
 * Firestore when credentials exist, the local disk store otherwise. The
 * fallback is what makes the booth runnable before the Firebase project is
 * created — see SETUP.md.
 */
export async function getDb(): Promise<Db> {
  if (cached) return cached;
  cached = firebaseConfigured()
    ? (await import("./firestore")).firestoreDb
    : (await import("./local")).localDb;
  return cached;
}

/** Test seam: forget the memoised driver so env changes take effect. */
export function resetDbCache(): void {
  cached = null;
}

/**
 * The live preset, falling back to the built-in demo so a booth that has never
 * been configured still runs. A booth that shows an error because nobody
 * pressed "activate" is a worse failure than one showing sensible defaults.
 */
export async function getActivePresetOrDefault(): Promise<Preset> {
  const db = await getDb();
  const active = await db.getActivePreset();
  if (active) return active;

  const seeded = defaultPreset();
  await db.savePreset(seeded);
  return seeded;
}

/**
 * Strip everything the kiosk has no business knowing. Retention windows and
 * draft/live state are operator concerns; keeping them out of the public
 * payload means a curious guest with devtools learns nothing useful.
 */
export function sanitisePreset(preset: Preset): PublicPreset {
  const parsed = presetSchema.parse(preset);

  // Built by naming what the kiosk gets rather than by removing what it must
  // not have: a field added to Preset later is then private until chosen.
  return {
    id: parsed.id,
    name: parsed.name,
    branding: parsed.branding,
    flow: parsed.flow,
    generation: parsed.generation,
    form: { ...parsed.form, fields: parsed.form.fields.filter((field) => field.enabled) },
    scenes: parsed.scenes.filter((option) => option.enabled),
    poses: parsed.poses.filter((option) => option.enabled),
    treatments: parsed.treatments.filter((option) => option.enabled),
  };
}

export type { Db, SessionQuery } from "./types";
export { NotFoundError } from "./types";
export { defaultPreset, DEFAULT_PRESET_ID } from "./seed";
