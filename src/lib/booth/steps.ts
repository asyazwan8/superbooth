import type { BoothOption, PublicPreset } from "@/lib/schema";

/**
 * The booth's step model, shared by the kiosk UI and the server.
 *
 * Both need the same answer to "which steps exist for this preset, and which
 * option did the guest end up with" — the client to render and to run Back,
 * the server to build the prompt. Deriving it in one place is what stops a
 * fixed-mode step from being skipped on screen but re-asked by the API.
 */

export type ChoiceKey = "scene" | "pose" | "treatment";

export type StepId =
  | "details"
  | "scene"
  | "pose"
  | "treatment"
  | "capture"
  | "review"
  | "generating"
  | "pick"
  | "result";

export const CHOICE_KEYS: ChoiceKey[] = ["scene", "pose", "treatment"];

const COLLECTIONS: Record<ChoiceKey, keyof Pick<PublicPreset, "scenes" | "poses" | "treatments">> = {
  scene: "scenes",
  pose: "poses",
  treatment: "treatments",
};

export const STEP_TITLES: Record<ChoiceKey, { title: string; subtitle: string }> = {
  scene: { title: "Choose your scene", subtitle: "Where should this portrait happen?" },
  pose: { title: "Pick your look", subtitle: "Costume and pose" },
  treatment: { title: "Choose a style", subtitle: "How should it be rendered?" },
};

export function optionsFor(preset: PublicPreset, key: ChoiceKey): BoothOption[] {
  return preset[COLLECTIONS[key]].filter((option) => option.enabled);
}

/**
 * A choice step is shown only when the operator left it selectable AND there
 * is more than one option to choose between. A one-option "choice" is a tap
 * that teaches the guest nothing, so it is resolved silently instead.
 */
export function isChoiceVisible(preset: PublicPreset, key: ChoiceKey): boolean {
  if (preset.flow[key].mode === "fixed") return false;
  return optionsFor(preset, key).length > 1;
}

/**
 * The option a session ends up with, whatever route it took: the guest's
 * selection, the operator's fixed choice, or the single available option.
 */
export function resolveOption(
  preset: PublicPreset,
  key: ChoiceKey,
  selectedId: string | null,
): BoothOption | null {
  const options = optionsFor(preset, key);
  if (options.length === 0) return null;

  const config = preset.flow[key];
  if (config.mode === "fixed") {
    return options.find((option) => option.id === config.fixedId) ?? options[0];
  }
  if (selectedId) {
    const chosen = options.find((option) => option.id === selectedId);
    if (chosen) return chosen;
  }
  return options.length === 1 ? options[0] : null;
}

/** The ordered steps a guest actually walks through for this preset. */
export function stepSequence(preset: PublicPreset): StepId[] {
  const steps: StepId[] = ["details"];
  for (const key of CHOICE_KEYS) {
    if (isChoiceVisible(preset, key)) steps.push(key);
  }
  steps.push("capture", "review", "generating");
  if (preset.generation.variants > 1) steps.push("pick");
  steps.push("result");
  return steps;
}

/**
 * Steps the Back button can return to. Generation has started by "generating",
 * so everything from there on is one-way — offering Back there would either
 * strand a paid request or imply a cancel the model does not support.
 */
export function isBackAllowed(step: StepId): boolean {
  return step !== "details" && step !== "generating" && step !== "result";
}

/**
 * Steps counted in the progress indicator.
 *
 * Only the steps a guest works through on the way to the shutter count.
 * Review, generating, pick and result all happen after their input is done —
 * including them would show a guest "5 of 7" while they are already watching
 * their portrait render.
 */
const UNCOUNTED: StepId[] = ["review", "generating", "pick", "result"];

export function progressSteps(preset: PublicPreset): StepId[] {
  return stepSequence(preset).filter((step) => !UNCOUNTED.includes(step));
}
