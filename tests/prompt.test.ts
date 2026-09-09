import { describe, expect, it } from "vitest";
import { buildPrompt, buildScenePrompt, estimateCostUsd } from "@/lib/fal/prompt";
import { defaultPreset } from "@/lib/db/seed";
import type { BoothOption, Customisation, PublicPreset, Theme } from "@/lib/schema";

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
    themes: full.themes,
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

function theme(overrides: Partial<Theme> = {}): Theme {
  return { ...option({ id: "theme" }), customisations: [], ...overrides };
}

function slot(label: string, chosen: BoothOption): { slot: Customisation; option: BoothOption } {
  return {
    slot: { id: `slot-${label}`, label, title: "", subtitle: "", options: [chosen], enabled: true },
    option: chosen,
  };
}

describe("buildPrompt", () => {
  it("always puts the guest photo first, since the identity lock names it", () => {
    const built = buildPrompt(
      preset(),
      {
        theme: theme({ imageUrl: "https://example.com/theme.jpg" }),
        customisations: [slot("Outfit", option({ id: "o", prompt: "a tuxedo" }))],
      },
      PHOTO,
    );

    expect(built.imageUrls[0]).toBe(PHOTO);
    expect(built.prompt).toContain("FIRST reference image");
  });

  it("refers to each reference by the position it actually occupies", () => {
    // With no theme image, the outfit reference becomes the *second* image —
    // if the prompt still called it the third, the model would bind the
    // instruction to an image that isn't there.
    const built = buildPrompt(
      preset(),
      {
        theme: theme({ prompt: "a rooftop", imageUrl: null }),
        customisations: [
          slot("Outfit", option({ id: "o", prompt: "a tuxedo", imageUrl: "https://example.com/outfit.jpg" })),
        ],
      },
      PHOTO,
    );

    expect(built.imageUrls).toEqual([PHOTO, "https://example.com/outfit.jpg"]);
    expect(built.prompt).toContain("second reference image");
    expect(built.prompt).not.toContain("third reference image");
  });

  it("omits a reference the operator marked as thumbnail-only", () => {
    const built = buildPrompt(
      preset(),
      {
        theme: theme({ imageUrl: "https://example.com/theme.jpg", useAsReference: false }),
        customisations: [],
      },
      PHOTO,
    );

    expect(built.imageUrls).toEqual([PHOTO]);
  });

  it("names each customisation with the operator's own label", () => {
    // The label is what binds a fragment to the right thing: "ACCESSORY — a
    // sheathed machete" reads far more reliably than the fragment alone.
    const built = buildPrompt(
      preset(),
      {
        theme: theme(),
        customisations: [
          slot("Accessory", option({ id: "a", prompt: "a sheathed machete on the hip" })),
          slot("Superpower", option({ id: "p", prompt: "flame wreathing the hands" })),
        ],
      },
      PHOTO,
    );

    expect(built.prompt).toContain("ACCESSORY — a sheathed machete on the hip");
    expect(built.prompt).toContain("SUPERPOWER — flame wreathing the hands");
  });

  it("tells the model not to take the face from any other reference", () => {
    const built = buildPrompt(
      preset(),
      {
        theme: theme({ imageUrl: "https://example.com/theme.jpg" }),
        customisations: [],
      },
      PHOTO,
    );

    expect(built.prompt).toContain("Do not copy any face");
  });

  it("asks for the whole figure, since the guest chose an outfit and shoes", () => {
    const built = buildPrompt(preset(), { theme: theme(), customisations: [] }, PHOTO);

    expect(built.prompt).toContain("full-body");
    expect(built.prompt).toContain("head to toe");
    // The captured photo is framed far tighter than the output, so the model
    // is told to complete the figure rather than to reproduce one.
    expect(built.prompt).toContain("extend and complete the");
  });

  it("appends the event's house style when one is set", () => {
    const base = preset();
    const built = buildPrompt(
      { generation: { ...base.generation, styleSuffix: "Warm golden grade." } },
      { theme: null, customisations: [] },
      PHOTO,
    );

    expect(built.prompt).toContain("Warm golden grade.");
  });

  it("guards against added text and extra people", () => {
    const built = buildPrompt(preset(), { theme: null, customisations: [] }, PHOTO);
    expect(built.prompt).toContain("watermarks");
    expect(built.prompt).toContain("A single subject only");
  });

  it("stays within the model's 14-image reference limit", () => {
    const built = buildPrompt(
      preset(),
      {
        theme: theme({ imageUrl: "https://example.com/a.jpg" }),
        customisations: [
          slot("One", option({ id: "1", imageUrl: "https://example.com/b.jpg" })),
          slot("Two", option({ id: "2", imageUrl: "https://example.com/c.jpg" })),
          slot("Three", option({ id: "3", imageUrl: "https://example.com/d.jpg" })),
          slot("Four", option({ id: "4", imageUrl: "https://example.com/e.jpg" })),
        ],
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
