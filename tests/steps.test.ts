import { describe, expect, it } from "vitest";
import {
  askedCustomisations,
  customisationIndex,
  isThemeStepVisible,
  progressSteps,
  resolveAllCustomisations,
  resolveCustomisation,
  resolveTheme,
  stepSequence,
} from "@/lib/booth/steps";
import { defaultPreset } from "@/lib/db/seed";
import type { PublicPreset } from "@/lib/schema";

/*
 * One shared preset. Option ids are generated per build, so calling
 * `defaultPreset()` twice yields two sets of themes whose ids do not match —
 * and every assertion here is about resolving an id.
 */
const BASE = defaultPreset(1_000);

function preset(overrides: Partial<PublicPreset> = {}): PublicPreset {
  return {
    id: BASE.id,
    name: BASE.name,
    branding: BASE.branding,
    flow: BASE.flow,
    generation: BASE.generation,
    form: BASE.form,
    themes: BASE.themes,
    ...overrides,
  };
}

const themeNamed = (label: string) => BASE.themes.find((theme) => theme.label === label)!;
const superhero = () => themeNamed("Superhero Comicbook");
const eighties = () => themeNamed("80s");

describe("stepSequence", () => {
  it("asks the theme first, then that theme's own questions", () => {
    expect(stepSequence(preset(), eighties().id)).toEqual([
      "details",
      "theme",
      "custom-0",
      "custom-1",
      "custom-2",
      "capture",
      "review",
      "generating",
      "pick",
      "result",
    ]);
  });

  it("is longer for a theme that asks more — the superhero's power", () => {
    const shortest = stepSequence(preset(), eighties().id);
    const longest = stepSequence(preset(), superhero().id);

    expect(longest.length).toBe(shortest.length + 1);
    expect(longest).toContain("custom-3");
  });

  it("cannot know the customisations before a theme is chosen", () => {
    const sequence = stepSequence(preset(), null);
    expect(sequence).toEqual([
      "details",
      "theme",
      "capture",
      "review",
      "generating",
      "pick",
      "result",
    ]);
  });

  it("skips the theme step the operator has fixed, and still asks its questions", () => {
    const base = preset();
    const pinned = preset({
      flow: { theme: { mode: "fixed", fixedId: superhero().id } },
    });

    expect(base.flow.theme.mode).toBe("select");
    const sequence = stepSequence(pinned, null);
    expect(sequence).not.toContain("theme");
    expect(sequence).toContain("custom-3");
  });

  it("skips a one-theme choice — a single option is not a choice", () => {
    const single = preset({ themes: [eighties()] });
    expect(stepSequence(single, null)).not.toContain("theme");
  });

  it("drops the pick step when only one variant is generated", () => {
    const base = preset();
    const sequence = stepSequence(
      preset({ generation: { ...base.generation, variants: 1 } }),
      eighties().id,
    );
    expect(sequence).not.toContain("pick");
  });
});

describe("customisationIndex", () => {
  it("reads the index out of a customisation step, and only those", () => {
    expect(customisationIndex("custom-0")).toBe(0);
    expect(customisationIndex("custom-3")).toBe(3);
    expect(customisationIndex("theme")).toBeNull();
    expect(customisationIndex("capture")).toBeNull();
  });
});

describe("resolveTheme", () => {
  it("returns the operator's pinned theme regardless of what the client sends", () => {
    const pinned = preset({ flow: { theme: { mode: "fixed", fixedId: superhero().id } } });
    // A stale or tampered client could name any id; the pinned theme wins.
    expect(resolveTheme(pinned, eighties().id)?.label).toBe("Superhero Comicbook");
  });

  it("falls back to the first theme when the pinned id no longer exists", () => {
    const stale = preset({ flow: { theme: { mode: "fixed", fixedId: "theme-deleted" } } });
    expect(resolveTheme(stale, null)?.id).toBe(BASE.themes[0].id);
  });

  it("ignores a selection that is not on offer", () => {
    expect(resolveTheme(preset(), "theme-not-real")).toBeNull();
  });

  it("resolves the only theme without the guest choosing", () => {
    expect(resolveTheme(preset({ themes: [eighties()] }), null)?.label).toBe("80s");
  });

  it("returns null when there are no themes at all", () => {
    expect(resolveTheme(preset({ themes: [] }), null)).toBeNull();
  });
});

describe("askedCustomisations", () => {
  it("only asks a slot that offers a real choice", () => {
    const theme = eighties();
    const trimmed = {
      ...theme,
      customisations: [
        { ...theme.customisations[0], options: theme.customisations[0].options.slice(0, 1) },
        theme.customisations[1],
      ],
    };

    expect(askedCustomisations(trimmed).map((slot) => slot.label)).toEqual([
      theme.customisations[1].label,
    ]);
  });

  it("skips a slot the operator disabled", () => {
    const theme = eighties();
    const off = {
      ...theme,
      customisations: theme.customisations.map((slot, index) =>
        index === 0 ? { ...slot, enabled: false } : slot,
      ),
    };
    expect(askedCustomisations(off)).toHaveLength(theme.customisations.length - 1);
  });
});

describe("resolveCustomisation", () => {
  it("takes the guest's choice when it is one of the options", () => {
    const slot = eighties().customisations[0];
    expect(resolveCustomisation(slot, slot.options[2].id)?.id).toBe(slot.options[2].id);
  });

  it("ignores an option id that is not in this slot", () => {
    const slot = eighties().customisations[0];
    expect(resolveCustomisation(slot, "opt-not-real")).toBeNull();
  });

  it("resolves a single option silently, since the guest was never asked", () => {
    const slot = eighties().customisations[0];
    const single = { ...slot, options: slot.options.slice(0, 1) };
    expect(resolveCustomisation(single, null)?.id).toBe(slot.options[0].id);
  });
});

describe("resolveAllCustomisations", () => {
  it("keeps the theme's own order rather than the order the guest answered", () => {
    const theme = superhero();
    const [outfit, power] = theme.customisations;

    const resolved = resolveAllCustomisations(theme, {
      [power.id]: power.options[0].id,
      [outfit.id]: outfit.options[0].id,
    });

    expect(resolved.map((entry) => entry.slot.label)).toEqual([outfit.label, power.label]);
  });

  it("drops a slot the guest never answered and that has no single default", () => {
    const theme = eighties();
    const resolved = resolveAllCustomisations(theme, {});
    expect(resolved).toHaveLength(0);
  });
});

describe("isThemeStepVisible", () => {
  it("hides a fixed theme and shows a selectable one", () => {
    expect(isThemeStepVisible(preset())).toBe(true);
    expect(
      isThemeStepVisible(preset({ flow: { theme: { mode: "fixed", fixedId: null } } })),
    ).toBe(false);
  });
});

describe("progressSteps", () => {
  it("estimates from the longest theme before one is chosen", () => {
    // Otherwise the indicator reads "2 of 3" on the theme screen and leaps to
    // "4 of 7" one tap later, which looks like a fault rather than progress.
    const before = progressSteps(preset(), null);
    const after = progressSteps(preset(), superhero().id);

    expect(before.length).toBe(after.length);
    // It may still settle down by a step for a theme that asks less; it never
    // jumps forward.
    expect(progressSteps(preset(), eighties().id).length).toBeLessThanOrEqual(before.length);
  });

  it("counts only what the guest works through before the shutter", () => {
    const steps = progressSteps(preset(), superhero().id);
    expect(steps).toEqual([
      "details",
      "theme",
      "custom-0",
      "custom-1",
      "custom-2",
      "custom-3",
      "capture",
    ]);
    expect(steps).not.toContain("pick");
    expect(steps).not.toContain("result");
  });
});
