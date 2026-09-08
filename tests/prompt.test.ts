import { describe, expect, it } from "vitest";
import { buildPrompt, buildScenePrompt, estimateCostUsd } from "@/lib/fal/prompt";
import { defaultPreset } from "@/lib/db/seed";
import type { BoothOption, PublicPreset } from "@/lib/schema";

const PHOTO = "https://storage.example.com/guest.jpg";

function preset(): PublicPreset {
  const full = defaultPreset();
  return {
    id: full.id,
    name: full.name,
    branding: full.branding,
    flow: full.flow,
    generation: full.generation,
    form: full.form,
    scenes: full.scenes,
    poses: full.poses,
    treatments: full.treatments,
  };
}

function option(overrides: Partial<BoothOption> = {}): BoothOption {
  return {
    id: "opt",
    label: "Option",
    prompt: "",
    imageUrl: null,
    useAsReference: true,
    enabled: true,
    ...overrides,
  };
}

describe("buildPrompt", () => {
  it("always puts the guest photo first, since the identity lock names it", () => {
    const built = buildPrompt(
      preset(),
      {
        scene: option({ id: "s", imageUrl: "https://example.com/scene.jpg" }),
        pose: option({ id: "p", imageUrl: "https://example.com/pose.jpg" }),
        treatment: option({ id: "t", prompt: "cinematic" }),
      },
      PHOTO,
    );

    expect(built.imageUrls[0]).toBe(PHOTO);
    expect(built.prompt).toContain("FIRST reference image");
  });

  it("refers to each reference by the position it actually occupies", () => {
    // With no scene image, the pose reference becomes the *second* image —
    // if the prompt still called it the third, the model would bind the
    // wardrobe instruction to an image that isn't there.
    const built = buildPrompt(
      preset(),
      {
        scene: option({ id: "s", prompt: "a rooftop", imageUrl: null }),
        pose: option({ id: "p", prompt: "a tuxedo", imageUrl: "https://example.com/pose.jpg" }),
        treatment: null,
      },
      PHOTO,
    );

    expect(built.imageUrls).toEqual([PHOTO, "https://example.com/pose.jpg"]);
    expect(built.prompt).toContain("second reference image");
    expect(built.prompt).not.toContain("third reference image");
  });

  it("omits a reference the operator marked as thumbnail-only", () => {
    const built = buildPrompt(
      preset(),
      {
        scene: option({ id: "s", imageUrl: "https://example.com/scene.jpg", useAsReference: false }),
        pose: null,
        treatment: null,
      },
      PHOTO,
    );

    expect(built.imageUrls).toEqual([PHOTO]);
  });

  it("tells the model to take the outfit but not the face from the pose reference", () => {
    const built = buildPrompt(
      preset(),
      { scene: null, pose: option({ imageUrl: "https://example.com/pose.jpg" }), treatment: null },
      PHOTO,
    );

    expect(built.prompt).toContain("Do not copy the face");
  });

  it("appends the event's house style when one is set", () => {
    const base = preset();
    const built = buildPrompt(
      { generation: { ...base.generation, styleSuffix: "Warm golden grade." } },
      { scene: null, pose: null, treatment: null },
      PHOTO,
    );

    expect(built.prompt).toContain("Warm golden grade.");
  });

  it("guards against added text and extra people", () => {
    const built = buildPrompt(preset(), { scene: null, pose: null, treatment: null }, PHOTO);
    expect(built.prompt).toContain("watermarks");
    expect(built.prompt).toContain("A single subject only");
  });

  it("stays within the model's 14-image reference limit", () => {
    const built = buildPrompt(
      preset(),
      {
        scene: option({ imageUrl: "https://example.com/a.jpg" }),
        pose: option({ imageUrl: "https://example.com/b.jpg" }),
        treatment: option({ imageUrl: "https://example.com/c.jpg" }),
      },
      PHOTO,
    );

    expect(built.imageUrls.length).toBeLessThanOrEqual(14);
  });
});

describe("buildScenePrompt", () => {
  it("excludes people, which would otherwise confuse the identity lock", () => {
    const prompt = buildScenePrompt("a neon alleyway");
    expect(prompt).toContain("no people");
    expect(prompt).toContain("9:16");
  });
});

describe("estimateCostUsd", () => {
  it("prices 1K and 2K the same and 4K at double", () => {
    expect(estimateCostUsd(2, "1K")).toBe(0.3);
    expect(estimateCostUsd(2, "2K")).toBe(0.3);
    expect(estimateCostUsd(2, "4K")).toBe(0.6);
  });
});
