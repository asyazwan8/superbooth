import { z } from "zod";

/**
 * The single source of truth for every shape that crosses a boundary —
 * API bodies, Firestore documents, and the seeded demo preset all validate
 * against these. Firestore is schemaless, so parsing on read is what keeps a
 * hand-edited document from taking the booth down mid-event.
 */

/* ------------------------------------------------------------------ */
/* Booth options                                                       */
/* ------------------------------------------------------------------ */

export const MAX_OPTIONS = 6;
/** Slots a theme may ask about after it is chosen. */
export const MAX_CUSTOMISATIONS = 4;

/**
 * A themes's options and a customisation's options are structurally identical:
 * a label the guest taps, a prompt fragment sent to the model, and an optional
 * reference image. Keeping one type lets the admin editor reuse a single
 * component everywhere and keeps the prompt builder uniform.
 */
export const boothOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(40),
  /** Prompt fragment appended to the generation prompt when chosen. */
  prompt: z.string().max(1200).default(""),
  /**
   * Reference image, shown on the card. Also passed to the model as an
   * `image_urls` entry when `useAsReference` is set.
   */
  imageUrl: z.string().url().nullable().default(null),
  /** Whether the reference image should be sent to the model, not just shown. */
  useAsReference: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export type BoothOption = z.infer<typeof boothOptionSchema>;

/* ------------------------------------------------------------------ */
/* Themes and their customisations                                     */
/* ------------------------------------------------------------------ */

/**
 * One question a theme asks after it has been chosen — an outfit, an
 * accessory, a backdrop, a superpower.
 *
 * Customisations belong to a theme rather than to the preset because their
 * options only make sense inside one: a jungle ranger's outfits are not a
 * superhero's, and only the superhero is asked what power they have. That is
 * also why the guest journey's length is not known until a theme is picked.
 */
export const customisationSchema = z.object({
  id: z.string().min(1),
  /** Names the section this contributes to the prompt, e.g. "Outfit". */
  label: z.string().min(1).max(40),
  /** The kiosk headline for the step. Falls back to the label. */
  title: z.string().max(60).default(""),
  /** The line under the headline. */
  subtitle: z.string().max(120).default(""),
  options: z.array(boothOptionSchema).max(MAX_OPTIONS).default([]),
  enabled: z.boolean().default(true),
});

export type Customisation = z.infer<typeof customisationSchema>;

/**
 * A theme is the one thing a guest chooses before anything else: it carries
 * the whole look — rendering style, setting and wardrobe — and the handful of
 * questions worth asking inside it.
 */
export const themeSchema = boothOptionSchema.extend({
  customisations: z.array(customisationSchema).max(MAX_CUSTOMISATIONS).default([]),
});

export type Theme = z.infer<typeof themeSchema>;

/* ------------------------------------------------------------------ */
/* Guest form                                                          */
/* ------------------------------------------------------------------ */

export const formFieldTypeSchema = z.enum(["text", "email", "tel"]);
export type FormFieldType = z.infer<typeof formFieldTypeSchema>;

export const formFieldSchema = z.object({
  id: z.string().min(1),
  /** Stable key used as the Firestore field name; `name` and `email` are special. */
  key: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-z][a-zA-Z0-9_]*$/, "key must be a lowerCamelCase identifier"),
  label: z.string().min(1).max(40),
  placeholder: z.string().max(60).default(""),
  type: formFieldTypeSchema.default("text"),
  required: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

export type FormField = z.infer<typeof formFieldSchema>;

/* ------------------------------------------------------------------ */
/* Flow                                                                */
/* ------------------------------------------------------------------ */

/**
 * Every choice step can be either fixed by the operator (screen skipped for
 * the guest) or presented as a selection. `fixedId` names the option used when
 * the mode is "fixed".
 */
export const stepConfigSchema = z.object({
  mode: z.enum(["fixed", "select"]).default("select"),
  fixedId: z.string().nullable().default(null),
});

export type StepConfig = z.infer<typeof stepConfigSchema>;

export const flowSchema = z.object({
  /**
   * The theme step. Customisations have no flow config of their own — a slot
   * with fewer than two options is simply not a question, so it resolves
   * silently rather than costing the guest a tap.
   */
  theme: stepConfigSchema,
});

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

export const resolutionSchema = z.enum(["1K", "2K", "4K"]);
export type Resolution = z.infer<typeof resolutionSchema>;

export const generationSchema = z.object({
  /** Variants offered to the guest to pick from. Each one costs a generation. */
  variants: z.number().int().min(1).max(4).default(2),
  resolution: resolutionSchema.default("2K"),
  /** How many times a guest may regenerate before the booth moves on. */
  retryLimit: z.number().int().min(0).max(5).default(1),
  /** Seconds of inactivity before the booth warns, then resets to attract. */
  idleTimeoutSec: z.number().int().min(20).max(600).default(90),
  /** Capture countdown length. */
  countdownSec: z.number().int().min(1).max(10).default(3),
  /** Mirror the live preview so guests see themselves as in a mirror. */
  mirrorPreview: z.boolean().default(true),
  /**
   * Extra instruction appended to every prompt for this preset — the operator's
   * global lever for pushing a house style without editing six options.
   */
  styleSuffix: z.string().max(600).default(""),
});

export type GenerationSettings = z.infer<typeof generationSchema>;

/* ------------------------------------------------------------------ */
/* Branding                                                            */
/* ------------------------------------------------------------------ */

export const brandingSchema = z.object({
  /** Masthead shown on the attract screen and in the booth header. */
  logoUrl: z.string().url().nullable().default(null),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#7c5cff"),
  accentSoft: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#a08cff"),
  /** Transparent 1080x1920 PNG composited over the final image. */
  overlayUrl: z.string().url().nullable().default(null),
  overlayEnabled: z.boolean().default(false),
  attractHeadline: z.string().max(60).default("Step into the frame"),
  attractSubline: z.string().max(120).default("Tap anywhere to begin"),
});

export type Branding = z.infer<typeof brandingSchema>;

/* ------------------------------------------------------------------ */
/* Preset                                                              */
/* ------------------------------------------------------------------ */

export const consentSchema = z.object({
  text: z.string().min(1).max(2000),
  version: z.string().min(1).max(20),
  /** Optional link to a full privacy notice, opened in a modal on the kiosk. */
  policyUrl: z.string().url().nullable().default(null),
});

export const retentionSchema = z.object({
  /** Days before personal data is purged. 0 disables automatic purging. */
  days: z.number().int().min(0).max(3650).default(90),
});

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  /** Exactly one preset is live at a time; the rest are drafts. */
  isActive: z.boolean().default(false),
  branding: brandingSchema,
  form: z.object({
    fields: z.array(formFieldSchema).max(8),
    consent: consentSchema,
  }),
  themes: z.array(themeSchema).max(MAX_OPTIONS),
  flow: flowSchema,
  generation: generationSchema,
  retention: retentionSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export type Preset = z.infer<typeof presetSchema>;

/** Preset fields the kiosk is allowed to see. Mirrors `sanitisePreset`. */
export const publicPresetSchema = presetSchema.omit({
  isActive: true,
  createdAt: true,
  updatedAt: true,
  retention: true,
});

export type PublicPreset = z.infer<typeof publicPresetSchema>;

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export const sessionStatusSchema = z.enum([
  "started",
  "capturing",
  "generating",
  "ready",
  "completed",
  "failed",
  "abandoned",
]);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionChoicesSchema = z.object({
  themeId: z.string().nullable().default(null),
  /** Customisation id to chosen option id. Empty when a theme asks nothing. */
  customisations: z.record(z.string(), z.string()).default({}),
});

export const sessionSchema = z.object({
  id: z.string().min(1),
  /** Short, QR-friendly public identifier used in /p/<shortId>. */
  shortId: z.string().min(6).max(16),
  presetId: z.string().min(1),
  presetName: z.string().default(""),

  /** Guest-entered values keyed by `FormField.key`. Purged on expiry. */
  fields: z.record(z.string(), z.string()).default({}),
  consent: z.object({
    accepted: z.boolean(),
    version: z.string(),
    text: z.string(),
    acceptedAt: z.number().int(),
  }),

  choices: sessionChoicesSchema,
  /**
   * The same choices as human-readable text, denormalised on purpose: an
   * operator renaming a theme must not rewrite what last week's guests chose,
   * and the sessions table has to stay readable after an option is deleted.
   */
  labels: z
    .object({
      theme: z.string().nullable().default(null),
      /** Customisation label to chosen option label. */
      customisations: z.record(z.string(), z.string()).default({}),
    })
    .default({ theme: null, customisations: {} }),

  /** Captured guest photo, in FAL storage. */
  sourceUrl: z.string().url().nullable().default(null),
  requestId: z.string().nullable().default(null),
  variantUrls: z.array(z.string().url()).default([]),
  selectedIndex: z.number().int().nullable().default(null),
  /** The picked variant after overlay compositing — what the QR resolves to. */
  finalUrl: z.string().url().nullable().default(null),

  status: sessionStatusSchema,
  error: z.string().nullable().default(null),
  attempts: z.number().int().min(0).default(0),
  /**
   * Billable images requested for this session. Tracked separately from
   * `variantUrls` because purging clears the URLs, and a purged session still
   * cost money — spend reporting has to survive data retention.
   */
  imagesGenerated: z.number().int().min(0).default(0),
  /** Hidden by a moderator: excluded from the gallery, kept for the guest. */
  hidden: z.boolean().default(false),

  timings: z
    .object({
      startedAt: z.number().int().nullable().default(null),
      capturedAt: z.number().int().nullable().default(null),
      generateStartedAt: z.number().int().nullable().default(null),
      generateEndedAt: z.number().int().nullable().default(null),
      completedAt: z.number().int().nullable().default(null),
    })
    .default({
      startedAt: null,
      capturedAt: null,
      generateStartedAt: null,
      generateEndedAt: null,
      completedAt: null,
    }),

  createdAt: z.number().int(),
  /** When personal data becomes eligible for purging. Null disables it. */
  expiresAt: z.number().int().nullable().default(null),
  purgedAt: z.number().int().nullable().default(null),
});

export type Session = z.infer<typeof sessionSchema>;

/* ------------------------------------------------------------------ */
/* API request bodies                                                  */
/* ------------------------------------------------------------------ */

export const createSessionBodySchema = z.object({
  fields: z.record(z.string(), z.string()),
  consentAccepted: z.boolean(),
});

export const uploadBodySchema = z.object({
  sessionId: z.string().min(1),
  /** data:image/jpeg;base64,... produced by the capture canvas. */
  dataUrl: z.string().startsWith("data:image/"),
});

export const generateBodySchema = z.object({
  sessionId: z.string().min(1),
  themeId: z.string().nullable(),
  /**
   * Customisation id to chosen option id. Every entry is re-resolved against
   * the live preset server-side, so an unknown key or a stale option id is
   * dropped rather than reaching the model.
   */
  customisations: z.record(z.string(), z.string()).default({}),
});

export const selectBodySchema = z.object({
  sessionId: z.string().min(1),
  index: z.number().int().min(0).max(3),
});

export const deleteRequestBodySchema = z.object({
  shortId: z.string().min(1),
});
