import { describe, expect, it } from "vitest";
import { needsThemeUpgrade, upgradePresetShape } from "@/lib/db/migrations";
import { defaultPreset } from "@/lib/db/seed";
import { presetSchema } from "@/lib/schema";

/**
 * A booth configured before themes existed still has `scenes`, `poses` and
 * `treatments` on disk. The current schema requires `themes` and knows nothing
 * about those fields, so without the upgrade the document fails validation on
 * read and the booth stops rather than degrades.
 */

/** A stored document in the shape the booth wrote before themes existed. */
function storedLegacyPreset(): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...defaultPreset(1_000) };
  delete rest.themes;
  delete rest.flow;
  return {
    ...rest,
    scenes: [
      {
        id: "scene-neon-city",
        label: "Neon City",
        prompt: "A rain-slicked futuristic city street at night.",
        imageUrl: "https://cdn.example.com/neon-city.jpg",
        useAsReference: true,
        enabled: true,
      },
    ],
    poses: [
      {
        id: "pose-hero",
        label: "Hero Stance",
        prompt: "Confident three-quarter hero stance.",
        imageUrl: null,
        useAsReference: true,
        enabled: true,
      },
    ],
    treatments: [
      {
        id: "treatment-2d",
        label: "2D Illustration",
        prompt: "A hand-drawn 2D character illustration.",
        imageUrl: null,
        useAsReference: false,
        enabled: true,
      },
    ],
    flow: {
      scene: { mode: "select", fixedId: null },
      pose: { mode: "select", fixedId: null },
      treatment: { mode: "fixed", fixedId: "treatment-2d" },
    },
  };
}

describe("needsThemeUpgrade", () => {
  it("recognises a document written before themes existed", () => {
    expect(needsThemeUpgrade(storedLegacyPreset())).toBe(true);
  });

  it("leaves a current document alone", () => {
    expect(needsThemeUpgrade(defaultPreset())).toBe(false);
  });

  it("does not fire twice", () => {
    expect(needsThemeUpgrade(upgradePresetShape(storedLegacyPreset()))).toBe(false);
  });

  it("ignores anything that is not a document", () => {
    expect(needsThemeUpgrade(null)).toBe(false);
    expect(needsThemeUpgrade([])).toBe(false);
    expect(needsThemeUpgrade("preset")).toBe(false);
  });
});

describe("upgradePresetShape", () => {
  it("produces a document the current schema accepts", () => {
    const upgraded = presetSchema.parse(upgradePresetShape(storedLegacyPreset()));

    expect(upgraded.themes.map((theme) => theme.label)).toEqual([
      "80s",
      "Cyberpunk",
      "Jungle Ranger",
      "Superhero Comicbook",
    ]);
    // The retired families are gone rather than carried as dead weight.
    expect(upgraded).not.toHaveProperty("scenes");
    expect(upgraded).not.toHaveProperty("poses");
    expect(upgraded).not.toHaveProperty("treatments");
  });

  it("drops a flow that pinned a step which no longer exists", () => {
    const upgraded = presetSchema.parse(upgradePresetShape(storedLegacyPreset()));
    expect(upgraded.flow).toEqual({
      theme: { mode: "select", fixedId: null },
      mood: { mode: "select", fixedId: null },
    });
  });

  it("gives the same ids every time, so a kiosk's snapshot stays valid", () => {
    /*
     * The upgrade runs on every read and is never written back, so a guest's
     * journey spans two of them: the booth page issues the ids, and
     * /api/booth/generate re-reads to resolve what they tapped. If the two
     * reads disagree the choice is silently dropped.
     */
    const readA = presetSchema.parse(upgradePresetShape(storedLegacyPreset()));
    const readB = presetSchema.parse(upgradePresetShape(storedLegacyPreset()));

    expect(readB.themes.map((theme) => theme.id)).toEqual(readA.themes.map((theme) => theme.id));
    expect(
      readB.themes.flatMap((theme) =>
        theme.customisations.flatMap((slot) => [
          slot.id,
          ...slot.options.map((option) => option.id),
        ]),
      ),
    ).toEqual(
      readA.themes.flatMap((theme) =>
        theme.customisations.flatMap((slot) => [
          slot.id,
          ...slot.options.map((option) => option.id),
        ]),
      ),
    );
  });

  it("gives a preset written before mood existed the shipped pair", () => {
    // The stored document has no `moods` at all. A required field here would
    // fail it on read and stop the booth; the schema's default is what turns
    // that into an upgrade.
    const upgraded = presetSchema.parse(upgradePresetShape(storedLegacyPreset()));
    expect(upgraded.moods.map((mood) => mood.label)).toEqual(["Happy", "Serious"]);
    expect(upgraded.moods.map((mood) => mood.id)).toEqual([
      "opt-mood-happy",
      "opt-mood-serious",
    ]);
  });

  it("carries across everything outside the catalogue", () => {
    const before = storedLegacyPreset();
    const after = presetSchema.parse(upgradePresetShape(before));

    expect(after.id).toBe(before.id);
    expect(after.isActive).toBe(before.isActive);
    expect(after.createdAt).toBe(before.createdAt);
    expect(after.branding).toEqual(before.branding);
    expect(after.form).toEqual(before.form);
    expect(after.generation).toEqual(before.generation);
    expect(after.retention).toEqual(before.retention);
  });

  it("returns a current document untouched", () => {
    const current = defaultPreset();
    expect(upgradePresetShape(current)).toBe(current);
  });
});
