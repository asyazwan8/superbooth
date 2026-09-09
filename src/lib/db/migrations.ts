import type { BoothOption, Preset } from "@/lib/schema";
import { defaultPreset } from "./seed";

/**
 * Bringing an unedited demo catalogue up to date with the shipped one.
 *
 * `defaultPreset` is only ever read when a store has no live preset, so a
 * booth that has been running since before a seed change keeps whatever it was
 * first given — which is right for an operator's own work and wrong for demo
 * content nobody has touched. A booth still showing the options it shipped
 * with is showing placeholder data, and a deploy that changes those options is
 * meant to reach it.
 *
 * The guard is deliberately strict: the swap happens only when all three
 * catalogues are still *exactly* as they shipped, field for field. Change one
 * prompt, rename one option, delete one scene, and the preset stops matching
 * and is never touched again — the operator has made it theirs. Nothing
 * outside the three catalogues is read or written either way, so branding,
 * form fields, generation settings and retention survive regardless.
 */

/** The catalogue shipped before scenes carried their own wardrobe. */
const SUPERSEDED: Pick<Preset, "scenes" | "poses" | "treatments"> = {
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
  ]
};

/** Every field of a catalogue entry, so a single edited prompt blocks the swap. */
function sameOption(option: BoothOption, shipped: BoothOption): boolean {
  return (
    option.id === shipped.id &&
    option.label === shipped.label &&
    option.prompt === shipped.prompt &&
    option.imageUrl === shipped.imageUrl &&
    option.useAsReference === shipped.useAsReference &&
    option.enabled === shipped.enabled
  );
}

function sameCatalogue(options: BoothOption[], shipped: BoothOption[]): boolean {
  return (
    options.length === shipped.length &&
    options.every((option, index) => sameOption(option, shipped[index]))
  );
}

/** True only for a preset whose three catalogues are untouched demo content. */
export function hasSupersededCatalogue(preset: Preset): boolean {
  return (
    sameCatalogue(preset.scenes, SUPERSEDED.scenes) &&
    sameCatalogue(preset.poses, SUPERSEDED.poses) &&
    sameCatalogue(preset.treatments, SUPERSEDED.treatments)
  );
}

/**
 * The same preset with the shipped catalogue in place of the superseded one.
 * Only the three lists change; `flow` is left alone because a family with no
 * options drops out of the sequence on its own (see lib/booth/steps).
 */
export function withShippedCatalogue(preset: Preset, now = Date.now()): Preset {
  const shipped = defaultPreset(now);
  return {
    ...preset,
    scenes: shipped.scenes,
    poses: shipped.poses,
    treatments: shipped.treatments,
    updatedAt: now,
  };
}
