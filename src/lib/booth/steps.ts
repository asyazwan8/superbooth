import type { BoothOption, Customisation, PublicPreset, Theme } from "@/lib/schema";

/**
 * The booth's step model, shared by the kiosk UI and the server.
 *
 * Both need the same answer to "which steps exist for this session, and which
 * option did the guest end up with" — the client to render and to run Back,
 * the server to build the prompt. Deriving it in one place is what stops a
 * fixed-mode step from being skipped on screen but re-asked by the API.
 *
 * The sequence is a function of the chosen theme, not of the preset alone: a
 * theme carries its own questions, so a guest picking Superhero is asked one
 * more thing than a guest picking 80s. Nothing downstream may assume a fixed
 * length.
 */

export type StepId =
  | "details"
  | "theme"
  | "mood"
  | `custom-${number}`
  | "capture"
  | "review"
  | "generating"
  | "pick"
  | "result";

/** The index a `custom-N` step refers to, or null for any other step. */
export function customisationIndex(step: StepId): number | null {
  if (!step.startsWith("custom-")) return null;
  const index = Number.parseInt(step.slice("custom-".length), 10);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

export function enabledThemes(preset: PublicPreset): Theme[] {
  return preset.themes.filter((theme) => theme.enabled);
}

export function enabledMoods(preset: PublicPreset): BoothOption[] {
  return preset.moods.filter((mood) => mood.enabled);
}

/**
 * The mood a session ends up with — the guest's choice, the operator's pinned
 * mood, or the only one on offer. Deliberately the same shape as
 * `resolveTheme`: the two are the same kind of decision, and a reader who has
 * understood one should not have to re-read the other.
 */
export function resolveMood(preset: PublicPreset, selectedId: string | null): BoothOption | null {
  const moods = enabledMoods(preset);
  if (moods.length === 0) return null;

  const config = preset.flow.mood;
  if (config.mode === "fixed") {
    return moods.find((mood) => mood.id === config.fixedId) ?? moods[0];
  }
  if (selectedId) {
    const chosen = moods.find((mood) => mood.id === selectedId);
    if (chosen) return chosen;
  }
  return moods.length === 1 ? moods[0] : null;
}

/**
 * The theme a session ends up with, whatever route it took: the guest's
 * choice, the operator's pinned theme, or the only one on offer.
 */
export function resolveTheme(preset: PublicPreset, selectedId: string | null): Theme | null {
  const themes = enabledThemes(preset);
  if (themes.length === 0) return null;

  const config = preset.flow.theme;
  if (config.mode === "fixed") {
    return themes.find((theme) => theme.id === config.fixedId) ?? themes[0];
  }
  if (selectedId) {
    const chosen = themes.find((theme) => theme.id === selectedId);
    if (chosen) return chosen;
  }
  return themes.length === 1 ? themes[0] : null;
}

/**
 * The questions a theme actually asks. A slot with one option is not a choice
 * — it is a tap that teaches the guest nothing — so it resolves silently.
 */
export function askedCustomisations(theme: Theme | null): Customisation[] {
  if (!theme) return [];
  return theme.customisations.filter(
    (slot) => slot.enabled && slot.options.filter((option) => option.enabled).length > 1,
  );
}

export function optionsFor(slot: Customisation): BoothOption[] {
  return slot.options.filter((option) => option.enabled);
}

/**
 * The option a customisation ends up with. A slot the guest was never asked
 * about still contributes when it has exactly one option — that is the point
 * of resolving it silently rather than dropping it.
 */
export function resolveCustomisation(
  slot: Customisation,
  selectedId: string | null | undefined,
): BoothOption | null {
  const options = optionsFor(slot);
  if (options.length === 0) return null;
  if (selectedId) {
    const chosen = options.find((option) => option.id === selectedId);
    if (chosen) return chosen;
  }
  return options.length === 1 ? options[0] : null;
}

/** Every customisation that contributes to the prompt, asked or not. */
export function resolveAllCustomisations(
  theme: Theme | null,
  selected: Record<string, string>,
): { slot: Customisation; option: BoothOption }[] {
  if (!theme) return [];
  return theme.customisations
    .filter((slot) => slot.enabled)
    .map((slot) => ({ slot, option: resolveCustomisation(slot, selected[slot.id]) }))
    .filter((entry): entry is { slot: Customisation; option: BoothOption } => entry.option !== null);
}

/**
 * The theme step is shown only when the operator left it selectable AND there
 * is more than one theme. A one-theme "choice" is a tap for nothing.
 */
export function isThemeStepVisible(preset: PublicPreset): boolean {
  if (preset.flow.theme.mode === "fixed") return false;
  return enabledThemes(preset).length > 1;
}

/** As above: pinned, or fewer than two moods, and there is nothing to ask. */
export function isMoodStepVisible(preset: PublicPreset): boolean {
  if (preset.flow.mood.mode === "fixed") return false;
  return enabledMoods(preset).length > 1;
}

/**
 * The ordered steps a guest walks through, given the theme they have chosen.
 * Before a theme is picked the customisation steps are not yet known — which
 * is why this takes the selection rather than the preset alone.
 */
export function stepSequence(preset: PublicPreset, themeId: string | null = null): StepId[] {
  const steps: StepId[] = ["details"];
  if (isThemeStepVisible(preset)) steps.push("theme");
  // Before the theme's own questions: mood is asked once and means the same
  // thing whichever theme was picked, so it reads as part of the same breath.
  if (isMoodStepVisible(preset)) steps.push("mood");

  const theme = resolveTheme(preset, themeId);
  askedCustomisations(theme).forEach((_, index) => steps.push(`custom-${index}`));

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

export function progressSteps(preset: PublicPreset, themeId: string | null = null): StepId[] {
  /*
   * Before a theme is chosen its questions are unknown, and counting only the
   * steps we are sure of makes the indicator read "2 of 3" on the theme screen
   * and then leap to "4 of 7" one tap later — which looks like a fault rather
   * than progress. Estimating from the theme that asks the most keeps the
   * total steady: it can still settle down by a step once the guest commits,
   * but it never jumps forward.
   */
  const estimate =
    themeId === null
      ? (enabledThemes(preset)
          .map((theme) => ({ theme, asked: askedCustomisations(theme).length }))
          .sort((a, b) => b.asked - a.asked)[0]?.theme.id ?? null)
      : themeId;

  return stepSequence(preset, estimate).filter((step) => !UNCOUNTED.includes(step));
}
