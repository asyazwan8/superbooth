import { buildTheme, stableIds } from "@/lib/theme/compose";
import { defaultMoods, type Preset } from "@/lib/schema";

/**
 * The preset a fresh install starts from.
 *
 * Every option here is prompt-only (no reference images) so the booth is
 * usable the moment it boots; the operator adds artwork in the admin backend.
 * Prompts describe looks generically rather than naming studios, artists or
 * existing characters — it keeps the output legally clean and, in practice,
 * describing the actual visual qualities steers the model better than a brand
 * name does.
 */

export const DEFAULT_PRESET_ID = "default";

export function defaultPreset(now = Date.now()): Preset {
  return {
    id: DEFAULT_PRESET_ID,
    name: "Superbooth Demo",
    isActive: true,

    branding: {
      logoUrl: null,
      accent: "#7c5cff",
      accentSoft: "#a08cff",
      overlayUrl: null,
      overlayEnabled: false,
      attractHeadline: "Step into the frame",
      attractSubline: "Tap anywhere to begin",
    },

    form: {
      fields: [
        {
          id: "field-name",
          key: "name",
          label: "Your name",
          placeholder: "e.g. Aisyah",
          type: "text",
          required: true,
          enabled: true,
        },
        {
          id: "field-email",
          key: "email",
          label: "Email address",
          placeholder: "you@example.com",
          type: "email",
          required: true,
          enabled: true,
        },
      ],
      consent: {
        text:
          "I consent to Superbooth collecting and processing my name, email address and photo " +
          "for the purpose of creating and delivering my portrait, in accordance with the " +
          "Personal Data Protection Act 2010. I understand I can request deletion at any time.",
        version: "1.0",
        policyUrl: null,
      },
    },

    /*
     * The four themes, built through the same composer the backend's build
     * button uses (see lib/theme/compose). Typing "80s" in the admin produces
     * exactly this, which is what makes that button worth trusting: the
     * shipped content is not a hand-written special case the builder can never
     * reproduce.
     *
     * Each theme carries its own customisations because their options only
     * make sense inside one — a jungle ranger's outfits are not a superhero's,
     * and only the superhero is asked what power they have.
     *
     * `stableIds` is load-bearing, not tidiness. This function is called on
     * every read of a preset stored in an older shape (lib/db/migrations), so
     * with the interactive minter the ids the kiosk handed a guest no longer
     * existed by the time they tapped one — `resolveTheme` returned null and
     * every guest silently got the no-theme fallback prompt.
     */
    themes: [
      buildTheme("80s", undefined, stableIds),
      buildTheme("Cyberpunk", undefined, stableIds),
      buildTheme("Jungle Ranger", undefined, stableIds),
      buildTheme("Superhero Comicbook", undefined, stableIds),
    ],

    /*
     * Mood is not listed beside the themes above because it is not theme
     * content: the schema carries the shipped pair as a parse-time default,
     * so a preset written before mood existed gains it on read rather than
     * failing validation.
     */
    moods: defaultMoods(),

    flow: {
      theme: { mode: "select", fixedId: null },
      mood: { mode: "select", fixedId: null },
    },

    generation: {
      variants: 2,
      resolution: "2K",
      retryLimit: 1,
      idleTimeoutSec: 90,
      countdownSec: 3,
      mirrorPreview: true,
      styleSuffix: "",
    },

    retention: { days: 90 },

    createdAt: now,
    updatedAt: now,
  };
}
