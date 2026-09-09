import type {
  BoothOption,
  Customisation,
  PublicPreset,
  Resolution,
  Theme,
} from "@/lib/schema";

/**
 * Prompt construction for `fal-ai/nano-banana-pro/edit`.
 *
 * The model receives an ordered list of reference images. Index 0 is always the
 * guest's captured photo, and the prompt refers to the images by position —
 * "the first reference image", "the second reference image" — because naming
 * the position is what reliably binds each instruction to the right picture.
 * Identity preservation is stated first and in the strongest terms: everything
 * else about a photobooth output can be a little off and still delight, but a
 * guest who doesn't recognise themselves is a failed session.
 */

export interface PromptChoices {
  theme: Theme | null;
  /** Resolved customisations, in the order the theme declares them. */
  customisations: { slot: Customisation; option: BoothOption }[];
}

export interface BuiltPrompt {
  prompt: string;
  imageUrls: string[];
  /** Ordinal position of each reference, for logging and admin debugging. */
  references: { role: "guest" | "theme" | "customisation"; index: number; url: string }[];
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh"] as const;

function ordinal(index: number): string {
  return ORDINALS[index] ?? `image number ${index + 1}`;
}

/** A reference is only sent to the model when it exists and is marked for use. */
function referenceUrl(option: { imageUrl: string | null; useAsReference: boolean } | null): string | null {
  if (!option) return null;
  if (!option.useAsReference) return null;
  return option.imageUrl ?? null;
}

const IDENTITY_LOCK = [
  "IDENTITY — this is the highest priority instruction and overrides every stylistic instruction below.",
  "The subject must remain the exact same person shown in the FIRST reference image:",
  "same facial structure and proportions, same eye shape and colour, same nose, same mouth,",
  "same skin tone, same hair colour and hairstyle, same facial hair, and keep any eyewear.",
  "The output must be instantly recognisable as this specific person to someone who knows them.",
  "Do not beautify, slim, smooth, lighten, age or de-age them, and do not change their build.",
].join(" ");

/**
 * Full length, always.
 *
 * The booth asks a guest to pick an outfit, an accessory and sometimes a pair
 * of boots' worth of superpower — a crop at the waist throws away most of what
 * they chose. The guest's photo is usually framed much tighter than this, so
 * the instruction says to complete the body rather than to reproduce one:
 * left unstated, the model tends to letterbox a head-and-shoulders shot inside
 * a vertical frame instead of rendering legs and feet.
 */
const FRAMING = [
  "FRAMING — vertical 9:16 full-body portrait. Show the subject from head to toe,",
  "with the whole figure inside the frame: face, torso, hands, legs and feet all visible,",
  "standing, with clear headroom above the head and ground visible beneath the feet.",
  "The reference photograph may be cropped tighter than this — extend and complete the",
  "figure naturally in keeping with the subject's build. Never crop at the waist, knees",
  "or the top of the head. Keep the face sharp, well lit and unobstructed, and keep it",
  "the focal point even at full length.",
].join(" ");

const GUARDS = [
  "DO NOT include any text, captions, lettering, watermarks, logos, signatures, UI elements,",
  "borders, frames, collage panels, or any additional people. A single subject only.",
].join(" ");

export function buildPrompt(
  preset: Pick<PublicPreset, "generation">,
  choices: PromptChoices,
  guestPhotoUrl: string,
): BuiltPrompt {
  const imageUrls: string[] = [guestPhotoUrl];
  const references: BuiltPrompt["references"] = [
    { role: "guest", index: 0, url: guestPhotoUrl },
  ];

  const sections: string[] = [];

  const themeText = choices.theme?.prompt?.trim();
  sections.push(
    themeText
      ? `Create a portrait of the person in the first reference image. ${themeText}`
      : "Create a polished, professional portrait of the person in the first reference image.",
  );

  sections.push(IDENTITY_LOCK);

  const themeRef = referenceUrl(choices.theme);
  if (themeRef) {
    const position = ordinal(imageUrls.length);
    references.push({ role: "theme", index: imageUrls.length, url: themeRef });
    imageUrls.push(themeRef);
    sections.push(
      [
        `THEME REFERENCE — use the ${position} reference image as the visual reference for the`,
        "setting, colour palette and lighting direction, but re-render it in the style above.",
        "Do not copy any face, hair or identity from it — those come from the first reference image.",
      ].join(" "),
    );
  }

  /*
   * One section per customisation, named with the operator's own label. The
   * label is what makes a fragment legible to the model: "ACCESSORY — a
   * sheathed machete on the hip" binds far more reliably than the fragment on
   * its own, and it is why the label is worth carrying through from the admin.
   */
  for (const { slot, option } of choices.customisations) {
    const fragment = option.prompt?.trim();
    const optionRef = referenceUrl(option);
    if (!fragment && !optionRef) continue;

    const parts = [`${slot.label.toUpperCase()} —`];
    if (fragment) parts.push(fragment);
    if (optionRef) {
      const position = ordinal(imageUrls.length);
      references.push({ role: "customisation", index: imageUrls.length, url: optionRef });
      imageUrls.push(optionRef);
      parts.push(
        `Use the ${position} reference image for this detail only.`,
        "Do not copy the face, hair or identity from it.",
      );
    }
    sections.push(parts.join(" "));
  }

  sections.push(FRAMING);

  const styleSuffix = preset.generation.styleSuffix?.trim();
  if (styleSuffix) sections.push(styleSuffix);

  sections.push(GUARDS);

  return { prompt: sections.join("\n\n"), imageUrls, references };
}

/**
 * Prompt used by the admin "generate a backdrop" tool. These are backdrops, so
 * the prompt explicitly excludes people — a reference with a person in it
 * confuses the identity lock at booth time.
 */
export function buildScenePrompt(description: string): string {
  return [
    `A photographic background plate: ${description.trim()}`,
    "Empty environment with no people, no animals and no text.",
    "Composed as a vertical 9:16 backdrop with clear negative space in the centre",
    "where a person will later be placed. Even, flattering light.",
  ].join(" ");
}

/** FAL bills per image; surfacing the estimate keeps event budgets predictable. */
export function estimateCostUsd(variants: number, resolution: Resolution): number {
  const perImage = resolution === "4K" ? 0.3 : 0.15;
  return Number((perImage * variants).toFixed(2));
}
