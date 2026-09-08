import type { Preset } from "@/lib/schema";

/**
 * The preset a fresh install starts from.
 *
 * Every option here is prompt-only (no reference images) so the booth is
 * usable the moment it boots; the operator adds scene and costume references
 * in the admin backend. Style prompts describe looks generically rather than
 * naming studios or artists — it keeps the output legally clean and, in
 * practice, describing the actual visual qualities steers the model better
 * than a brand name does.
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

    scenes: [
      {
        id: "scene-neon-city",
        label: "Neon City",
        prompt:
          "A rain-slicked futuristic city street at night, dense neon signage in magenta and " +
          "cyan reflecting in wet asphalt, shallow depth of field, cinematic haze.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-studio",
        label: "Studio",
        prompt:
          "A clean professional photography studio: seamless deep-charcoal backdrop, soft key " +
          "light from the upper left, gentle rim light separating the subject from the background.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-tropical",
        label: "Tropical Shore",
        prompt:
          "A golden-hour tropical beach, turquoise water and palm fronds softly blurred behind " +
          "the subject, warm low sunlight, gentle lens flare.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "scene-ballroom",
        label: "Grand Ballroom",
        prompt:
          "An opulent ballroom with crystal chandeliers, gilded columns and warm candlelight, " +
          "richly blurred behind the subject.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
    ],

    poses: [
      {
        id: "pose-hero",
        label: "Hero Stance",
        prompt:
          "Confident three-quarter hero stance, shoulders squared and slightly angled to camera, " +
          "chin level, direct eye contact. Smart contemporary outfit with clean tailored lines.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "pose-formal",
        label: "Formal",
        prompt:
          "Classic upright formal portrait pose, hands relaxed, warm closed-mouth smile. " +
          "Formal evening wear in deep jewel tones with subtle sheen.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
      {
        id: "pose-casual",
        label: "Casual",
        prompt:
          "Relaxed natural pose, weight on one leg, easy open smile. Casual modern streetwear " +
          "with a layered jacket.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
    ],

    treatments: [
      {
        id: "treatment-2d",
        label: "2D Illustration",
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
        label: "3D Character",
        prompt:
          "A polished 3D animated feature-film character render: soft subsurface-scattering skin, " +
          "large expressive eyes, slightly stylised proportions, rich global illumination and " +
          "soft contact shadows, glossy highlights in the hair.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
      {
        id: "treatment-abstract",
        label: "Abstract",
        prompt:
          "An abstract mixed-media portrait: bold geometric colour fields, torn-paper collage " +
          "edges, expressive brush strokes and halftone texture breaking across the composition, " +
          "while the face itself stays clear and readable.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
      {
        id: "treatment-editorial",
        label: "Editorial",
        prompt:
          "A high-end editorial photograph: crisp medium-format detail, controlled studio " +
          "lighting with a soft key and subtle rim, refined colour grade, magazine-cover polish.",
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
