import { describe, expect, it } from "vitest";
import {
  isChoiceVisible,
  progressSteps,
  resolveOption,
  stepSequence,
} from "@/lib/booth/steps";
import { defaultPreset } from "@/lib/db/seed";
import type { PublicPreset } from "@/lib/schema";

function preset(overrides: Partial<PublicPreset> = {}): PublicPreset {
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
    ...overrides,
  };
}

describe("stepSequence", () => {
  it("asks every choice when they are all selectable", () => {
    expect(stepSequence(preset())).toEqual([
      "details",
      "scene",
      "pose",
      "treatment",
      "capture",
      "review",
      "generating",
      "pick",
      "result",
    ]);
  });

  it("skips a step the operator has fixed", () => {
    const base = preset();
    const sequence = stepSequence(
      preset({ flow: { ...base.flow, scene: { mode: "fixed", fixedId: "scene-studio" } } }),
    );

    expect(sequence).not.toContain("scene");
    expect(sequence).toContain("pose");
  });

  it("skips a choice with only one option — a one-option choice is not a choice", () => {
    const base = preset();
    const sequence = stepSequence(preset({ treatments: [base.treatments[0]] }));
    expect(sequence).not.toContain("treatment");
  });

  it("drops the pick step when only one variant is generated", () => {
    const base = preset();
    const sequence = stepSequence(
      preset({ generation: { ...base.generation, variants: 1 } }),
    );
    expect(sequence).not.toContain("pick");
  });
});

describe("resolveOption", () => {
  it("returns the operator's pinned option regardless of what the client sends", () => {
    const base = preset();
    const pinned = preset({
      flow: { ...base.flow, treatment: { mode: "fixed", fixedId: "treatment-abstract" } },
    });

    // A stale or tampered client could send any id; the fixed choice wins.
    expect(resolveOption(pinned, "treatment", "treatment-2d")?.id).toBe("treatment-abstract");
  });

  it("falls back to the first option when the pinned id no longer exists", () => {
    const base = preset();
    const stale = preset({
      flow: { ...base.flow, scene: { mode: "fixed", fixedId: "scene-deleted" } },
    });

    expect(stale.scenes.map((option) => option.id)).not.toContain("scene-deleted");
    expect(resolveOption(stale, "scene", null)?.id).toBe(stale.scenes[0].id);
  });

  it("ignores a selection that is not one of the offered options", () => {
    expect(resolveOption(preset(), "scene", "scene-not-real")).toBeNull();
  });

  it("resolves the only option without the guest choosing", () => {
    const base = preset();
    const single = preset({ scenes: [base.scenes[1]] });
    expect(resolveOption(single, "scene", null)?.id).toBe(base.scenes[1].id);
  });

  it("returns null when a family has no options at all", () => {
    expect(resolveOption(preset({ poses: [] }), "pose", null)).toBeNull();
  });
});

describe("progressSteps", () => {
  it("counts only what the guest works through before the shutter", () => {
    const steps = progressSteps(preset());
    expect(steps).toEqual(["details", "scene", "pose", "treatment", "capture"]);
    expect(steps).not.toContain("pick");
    expect(steps).not.toContain("result");
  });
});

describe("isChoiceVisible", () => {
  it("hides a fixed choice and shows a selectable one", () => {
    const base = preset();
    expect(isChoiceVisible(base, "pose")).toBe(true);
    expect(
      isChoiceVisible(
        preset({ flow: { ...base.flow, pose: { mode: "fixed", fixedId: null } } }),
        "pose",
      ),
    ).toBe(false);
  });
});
