import { describe, expect, it } from "vitest";
import { hasSupersededCatalogue, withShippedCatalogue } from "@/lib/db/migrations";
import { defaultPreset } from "@/lib/db/seed";
import type { Preset } from "@/lib/schema";

/**
 * The catalogue refresh reaches a booth still running unedited demo content
 * and stops the moment an operator has made the preset theirs. Both halves
 * matter: the first is why a deploy changes anything at all, the second is
 * why it cannot overwrite someone's event an hour before doors.
 */

/** The catalogue as it shipped before scenes carried their own wardrobe. */
function supersededPreset(): Preset {
  return {
    ...defaultPreset(1_000),
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
  };
}

describe("hasSupersededCatalogue", () => {
  it("recognises a booth still running the catalogue it shipped with", () => {
    expect(hasSupersededCatalogue(supersededPreset())).toBe(true);
  });

  it("leaves a preset alone once one prompt has been edited", () => {
    const edited = supersededPreset();
    edited.scenes[1] = { ...edited.scenes[1], prompt: "Our own backdrop." };
    expect(hasSupersededCatalogue(edited)).toBe(false);
  });

  it("leaves a preset alone once an option has been renamed", () => {
    const edited = supersededPreset();
    edited.treatments[0] = { ...edited.treatments[0], label: "Cartoon" };
    expect(hasSupersededCatalogue(edited)).toBe(false);
  });

  it("leaves a preset alone once an option has been added or removed", () => {
    const trimmed = supersededPreset();
    trimmed.scenes = trimmed.scenes.slice(0, 3);
    expect(hasSupersededCatalogue(trimmed)).toBe(false);
  });

  it("does not fire twice — the shipped catalogue is not the superseded one", () => {
    expect(hasSupersededCatalogue(defaultPreset())).toBe(false);
    expect(hasSupersededCatalogue(withShippedCatalogue(supersededPreset()))).toBe(false);
  });
});

describe("withShippedCatalogue", () => {
  it("swaps in the shipped options", () => {
    const refreshed = withShippedCatalogue(supersededPreset(), 5_000);

    expect(refreshed.scenes.map((option) => option.label)).toEqual([
      "Neon",
      "Space",
      "Cyberpunk",
      "Jungle",
    ]);
    // The costume step drops out of the sequence once the list is empty.
    expect(refreshed.poses).toEqual([]);
    expect(refreshed.treatments.map((option) => option.label)).toEqual([
      "2D",
      "3D",
      "80s",
      "Superhero",
    ]);
  });

  it("touches nothing outside the three catalogues", () => {
    const before = supersededPreset();
    before.branding = { ...before.branding, logoUrl: "https://cdn.example.com/logo.png" };
    before.generation = { ...before.generation, variants: 1, countdownSec: 5 };

    const after = withShippedCatalogue(before, 5_000);

    expect(after.id).toBe(before.id);
    expect(after.isActive).toBe(before.isActive);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.branding).toEqual(before.branding);
    expect(after.form).toEqual(before.form);
    expect(after.generation).toEqual(before.generation);
    expect(after.retention).toEqual(before.retention);
    expect(after.updatedAt).toBe(5_000);
  });
});
