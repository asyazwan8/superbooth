import type { Preset } from "@/lib/schema";

/**
 * The preset a fresh install starts from.
 *
 * Every option here is prompt-only (no reference images) so the booth is
 * usable the moment it boots; the operator adds scene references in the admin
 * backend. Style prompts describe looks generically rather than naming studios
 * or artists — it keeps the output legally clean and, in practice, describing
 * the actual visual qualities steers the model better than a brand name does.
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
     * A scene is a place AND what you wear in it.
     *
     * The booth used to ask for a costume separately, which meant a guest
     * could put black tie on a jungle floor. Pairing the wardrobe with the
     * setting is one fewer tap, one fewer way to get an incoherent portrait,
     * and it is why the shipped preset has no poses: with the list empty the
     * step drops out of the sequence on its own (see lib/booth/steps), and an
     * operator who wants the costume choice back only has to add options.
     */
    scenes: [
      {
        id: "scene-neon",
        label: "Neon",
        prompt:
          "A rain-slicked city street at night under dense neon signage in magenta and cyan, " +
          "reflections pooling in wet asphalt, shallow depth of field and cinematic haze. " +
          "WARDROBE — a sleek modern jacket over a dark top, with the neon picking out the " +
          "edges of the shoulders and hair.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-space",
        label: "Space",
        prompt:
          "The observation deck of an orbital station: a vast starfield and the bright limb of " +
          "a planet filling the window behind the subject, cool blue key light with warm " +
          "instrument glow. WARDROBE — a fitted white and grey spacesuit with soft panel " +
          "seams, collar ring and a subtle mission patch, helmet off and held or absent.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-cyberpunk",
        label: "Cyberpunk",
        prompt:
          "A dense high-tech back alley of holographic advertising, cables and steam, lit in " +
          "electric violet and acid green with hard rim light. WARDROBE — a techwear coat with " +
          "utility straps and glowing trim, and understated cybernetic detailing at the collar.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-jungle",
        label: "Jungle",
        prompt:
          "Deep rainforest at midday: broad wet leaves, hanging vines and shafts of sunlight " +
          "cutting through the canopy, rich greens with warm highlights. WARDROBE — a rugged " +
          "explorer's outfit, canvas shirt with rolled sleeves, worn leather strap across the " +
          "shoulder.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
    ],

    /*
     * Empty on purpose — the wardrobe travels with the scene above. The field
     * and every screen behind it still work; adding an option here brings the
     * step back for the guest.
     */
    poses: [],

    treatments: [
      {
        id: "treatment-2d",
        label: "2D",
        prompt:
          "A hand-drawn 2D character illustration: clean confident linework, flat cel-shaded " +
          "colour with two-tone shadows, vibrant limited palette, subtle paper grain. " +
          "Stylised but anatomically faithful to the subject.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
      {
        id: "treatment-3d",
        label: "3D",
        prompt:
          "A polished 3D animated feature-film character render: soft subsurface-scattering skin, " +
          "large expressive eyes, slightly stylised proportions, rich global illumination and " +
          "soft contact shadows, glossy highlights in the hair.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
      {
        id: "treatment-80s",
        label: "80s",
        prompt:
          "A 1980s photograph: warm analogue film grain, soft diffusion glow around the " +
          "highlights, saturated magenta and teal grade, gentle halation, and the slightly " +
          "soft focus of a period portrait lens. Period hair and styling in keeping with the " +
          "decade, without changing the subject's own hair colour or face.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
      {
        /*
         * The one treatment that overrides the scene's wardrobe. The prompt
         * says so in as many words because both instructions land in the same
         * request, and the later section would otherwise win: the builder
         * puts STYLE first and SCENE after it.
         */
        id: "treatment-superhero",
        label: "Superhero",
        prompt:
          "A comic-book superhero portrait: dramatic heroic lighting, bold saturated colour and " +
          "crisp graphic contrast. WARDROBE OVERRIDE — dress the subject in an original " +
          "superhero costume with a sculpted emblem on the chest, gauntlets and a cape catching " +
          "the wind. This costume replaces any outfit described anywhere else in this prompt, " +
          "including the SCENE section; keep the setting from the SCENE section but ignore its " +
          "wardrobe entirely. Do not use any existing trademarked character or costume.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
    ],

    flow: {
      scene: { mode: "select", fixedId: null },
      pose: { mode: "select", fixedId: null },
      treatment: { mode: "select", fixedId: null },
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
