import { describe, expect, it } from "vitest";
import { defaultPreset } from "@/lib/db/seed";
import {
  buildTheme,
  composeCustomisations,
  composeThemePrompt,
  detectLook,
} from "@/lib/theme/compose";

/**
 * The builder is the backend's "type a name, get a theme" button. Its value
 * rests on being the same function that produced the shipped themes — if the
 * two ever drift, the button becomes a worse version of what the booth already
 * has, and an operator has no way to tell.
 */

describe("detectLook", () => {
  it("reads the look out of the name when it can", () => {
    expect(detectLook("80s")).toBe("retro");
    expect(detectLook("Superhero Comicbook")).toBe("comic");
    expect(detectLook("2D Cartoon")).toBe("illustrated");
  });

  it("falls back to photographic for a name that says nothing about style", () => {
    expect(detectLook("Deep Sea")).toBe("photographic");
    expect(detectLook("Cyberpunk")).toBe("photographic");
  });
});

describe("composeThemePrompt", () => {
  it("writes the sections a generation needs, in order", () => {
    const prompt = composeThemePrompt("Cyberpunk");
    expect(prompt).toContain("SETTING —");
    expect(prompt).toContain("WARDROBE —");
    expect(prompt.indexOf("SETTING —")).toBeLessThan(prompt.indexOf("WARDROBE —"));
  });

  it("leaves identity, framing and the guards to the generation prompt", () => {
    // Repeating them per theme would let an operator edit them away by
    // accident, one theme at a time, and never notice.
    const prompt = composeThemePrompt("Cyberpunk");
    expect(prompt).not.toContain("IDENTITY");
    expect(prompt).not.toContain("FRAMING");
    expect(prompt).not.toContain("watermarks");
  });

  it("scaffolds a name it has no recipe for, rather than returning nothing", () => {
    const prompt = composeThemePrompt("Deep Sea");
    expect(prompt).toContain("SETTING —");
    expect(prompt).toContain("Deep Sea");
  });

  it("honours an explicit look over the one detected from the name", () => {
    expect(composeThemePrompt("Deep Sea", "comic")).toContain("comic-book");
    expect(composeThemePrompt("Deep Sea")).not.toContain("comic-book");
  });

  it("is deterministic — the same name twice gives the same prompt", () => {
    expect(composeThemePrompt("Jungle Ranger")).toBe(composeThemePrompt("Jungle Ranger"));
  });
});

describe("composeCustomisations", () => {
  it("asks about a superpower only where one makes sense", () => {
    const hero = composeCustomisations("Superhero Comicbook").map((slot) => slot.label);
    const jungle = composeCustomisations("Jungle Ranger").map((slot) => slot.label);

    expect(hero).toContain("Superpower");
    expect(jungle).not.toContain("Superpower");
  });

  it("stays inside the four-slot cap", () => {
    for (const name of ["80s", "Cyberpunk", "Jungle Ranger", "Superhero Comicbook", "Deep Sea"]) {
      expect(composeCustomisations(name).length).toBeLessThanOrEqual(4);
    }
  });

  it("gives every slot a real question and options that carry prompt text", () => {
    for (const slot of composeCustomisations("Cyberpunk")) {
      expect(slot.title.length).toBeGreaterThan(0);
      expect(slot.options.length).toBeGreaterThan(0);
      for (const option of slot.options) {
        expect(option.label.length).toBeGreaterThan(0);
        expect(option.prompt.length).toBeGreaterThan(0);
      }
    }
  });

  it("gives each slot a fresh id, so two themes never collide", () => {
    const ids = [
      ...composeCustomisations("80s").map((slot) => slot.id),
      ...composeCustomisations("80s").map((slot) => slot.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildTheme", () => {
  it("reproduces what the booth ships with", () => {
    // The claim the backend's button makes: type "80s" and you get the shipped
    // theme. Ids differ per build, so everything else is compared.
    const shipped = defaultPreset().themes.find((entry) => entry.label === "80s")!;
    const built = buildTheme("80s");

    expect(built.prompt).toBe(shipped.prompt);
    expect(built.customisations.map((slot) => slot.label)).toEqual(
      shipped.customisations.map((slot) => slot.label),
    );
    expect(built.customisations.flatMap((slot) => slot.options.map((o) => o.prompt))).toEqual(
      shipped.customisations.flatMap((slot) => slot.options.map((o) => o.prompt)),
    );
  });

  it("trims the name it was given", () => {
    expect(buildTheme("  Cyberpunk  ").label).toBe("Cyberpunk");
  });

  it("does not send a theme's own artwork to the model by default", () => {
    // Card art is usually a mood board, not a plate to match: sending it would
    // fight the prompt it was chosen to illustrate.
    expect(buildTheme("Cyberpunk").useAsReference).toBe(false);
  });
});
