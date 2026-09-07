import type { BoothOption, PublicPreset, Resolution } from "@/lib/schema";

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
  scene: BoothOption | null;
  pose: BoothOption | null;
  treatment: BoothOption | null;
}

export interface BuiltPrompt {
  prompt: string;
  imageUrls: string[];
  /** Ordinal position of each reference, for logging and admin debugging. */
  references: { role: "guest" | "scene" | "pose"; index: number; url: string }[];
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth"] as const;

function ordinal(index: number): string {
  return ORDINALS[index] ?? `image number ${index + 1}`;
}

/** A reference is only sent to the model when it exists and is marked for use. */
function referenceUrl(option: BoothOption | null): string | null {
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

const FRAMING = [
  "FRAMING — vertical 9:16 portrait orientation.",
  "Compose the subject centred with the whole head visible and comfortable headroom;",
  "never crop the top of the head. Waist-up or three-quarter framing.",
  "Keep the face sharp, well lit and unobstructed, and make it the focal point of the image.",
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

  const sceneRef = referenceUrl(choices.scene);
  const poseRef = referenceUrl(choices.pose);

  let sceneOrdinal: string | null = null;
  if (sceneRef) {
    sceneOrdinal = ordinal(imageUrls.length);
    references.push({ role: "scene", index: imageUrls.length, url: sceneRef });
    imageUrls.push(sceneRef);
  }

  let poseOrdinal: string | null = null;
  if (poseRef) {
    poseOrdinal = ordinal(imageUrls.length);
    references.push({ role: "pose", index: imageUrls.length, url: poseRef });
    imageUrls.push(poseRef);
  }

  const sections: string[] = [];

  const treatmentText = choices.treatment?.prompt?.trim();
  sections.push(
    treatmentText
      ? `Create a portrait of the person in the first reference image. STYLE — ${treatmentText}`
      : "Create a polished, professional portrait of the person in the first reference image.",
  );

  sections.push(IDENTITY_LOCK);

  const sceneText = choices.scene?.prompt?.trim();
  if (sceneText || sceneOrdinal) {
    const parts = ["SCENE —"];
    if (sceneText) parts.push(sceneText);
    if (sceneOrdinal) {
      parts.push(
        `Use the ${sceneOrdinal} reference image as the visual reference for this background:`,
        "match its setting, colour palette and lighting direction, but re-render it in the style above.",
      );
    }
    parts.push("The subject must be lit consistently with this environment so they sit naturally in it.");
    sections.push(parts.join(" "));
  }

  const poseText = choices.pose?.prompt?.trim();
  if (poseText || poseOrdinal) {
    const parts = ["WARDROBE & POSE —"];
    if (poseText) parts.push(poseText);
    if (poseOrdinal) {
      parts.push(
        `Use the ${poseOrdinal} reference image only for the outfit, styling and body pose.`,
        "Do not copy the face, hair or identity from it — those come from the first reference image.",
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
 * Prompt used by the admin "generate a scene" tool. Scenes are backdrops, so
 * the prompt explicitly excludes people — a scene reference with a person in it
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
