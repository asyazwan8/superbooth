import { defaultPreset } from "./seed";

/**
 * Upgrading a stored preset to the current shape, before it is parsed.
 *
 * Firestore documents outlive deploys. A booth configured when the preset held
 * `scenes`, `poses` and `treatments` still has exactly that on disk, and the
 * current schema has no such fields and requires `themes` — so without this the
 * document fails validation on read and the booth stops rather than degrades.
 * Parsing on read is what makes that failure loud; this is what makes it
 * unnecessary.
 *
 * The old catalogue is not translated into themes, because there is no honest
 * translation: a theme is a whole look with its own questions, where a scene
 * was a backdrop chosen alongside an unrelated costume and an unrelated style.
 * Mapping four scenes onto four themes would invent content the operator never
 * wrote and quietly attach their prompts to a structure that changes what those
 * prompts mean. The catalogue is replaced with the shipped themes instead, and
 * everything outside it — branding, form fields, consent, generation settings,
 * retention, and the preset's own identity and live state — is carried across
 * untouched.
 *
 * Runs in the driver rather than at a call site so every read is covered: the
 * kiosk, the admin list, a duplicate, and the purge job all go through it.
 */

/** Fields the current schema knows nothing about, dropped on upgrade. */
const RETIRED = ["scenes", "poses", "treatments"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A document written before themes existed: no `themes`, but a catalogue. */
export function needsThemeUpgrade(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (Array.isArray(raw.themes)) return false;
  return RETIRED.some((field) => Array.isArray(raw[field]));
}

/**
 * The document with the shipped themes in place of the retired catalogue.
 * Returns the input untouched when there is nothing to upgrade, so this is
 * safe to call on every read.
 */
export function upgradePresetShape(raw: unknown): unknown {
  if (!needsThemeUpgrade(raw)) return raw;

  const document = { ...(raw as Record<string, unknown>) };
  for (const field of RETIRED) delete document[field];

  const shipped = defaultPreset();
  document.themes = shipped.themes;

  // The old flow named a step per catalogue family; only the theme step
  // survives, and an operator who had pinned a scene has not pinned a theme.
  document.flow = shipped.flow;

  return document;
}
