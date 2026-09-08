import { badRequest, handle, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { resolveOption } from "@/lib/booth/steps";
import { getDb, sanitisePreset } from "@/lib/db";
import { buildPrompt, estimateCostUsd } from "@/lib/fal/prompt";
import { getProvider } from "@/lib/fal/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Runs one real generation against a preset's settings, using a photo the
 * operator supplies.
 *
 * This is what stops a bad prompt being discovered by the first guest of the
 * event. It returns the exact prompt that was sent as well as the request id,
 * because seeing the assembled prompt is usually what explains a surprising
 * result. Poll the result via /api/admin/generate-status/[requestId].
 */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();

    const body = (await readJson(request)) as {
      presetId?: unknown;
      photoUrl?: unknown;
      sceneId?: unknown;
      poseId?: unknown;
      treatmentId?: unknown;
    };

    if (typeof body.presetId !== "string") throw badRequest("A preset is required.");
    if (typeof body.photoUrl !== "string") throw badRequest("Upload a test photo first.");

    const db = await getDb();
    const preset = await db.getPreset(body.presetId);
    if (!preset) throw badRequest("Preset not found.");

    const publicPreset = sanitisePreset(preset);

    /*
     * An explicitly named option always wins here, even when the operator has
     * pinned that step to "fixed". The point of this tool is to try a specific
     * combination — `resolveOption` alone would silently hand back the pinned
     * option and quietly test something other than what was asked for.
     */
    const pick = (key: "scene" | "pose" | "treatment", value: unknown) => {
      const options = key === "scene" ? publicPreset.scenes
        : key === "pose" ? publicPreset.poses
        : publicPreset.treatments;

      if (typeof value === "string" && value) {
        const explicit = options.find((option) => option.id === value);
        if (explicit) return explicit;
      }
      return resolveOption(publicPreset, key, null);
    };

    const { prompt, imageUrls } = buildPrompt(
      publicPreset,
      {
        scene: pick("scene", body.sceneId),
        pose: pick("pose", body.poseId),
        treatment: pick("treatment", body.treatmentId),
      },
      body.photoUrl,
    );

    const provider = await getProvider();
    const requestId = await provider.submit({
      prompt,
      imageUrls,
      numImages: 1,
      resolution: preset.generation.resolution,
    });

    return ok({
      requestId,
      prompt,
      imageUrls,
      costUsd: estimateCostUsd(1, preset.generation.resolution),
    });
  });
}
