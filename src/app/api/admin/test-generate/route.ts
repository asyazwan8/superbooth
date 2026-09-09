import { badRequest, handle, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { resolveAllCustomisations, resolveTheme } from "@/lib/booth/steps";
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
      themeId?: unknown;
      customisations?: unknown;
    };

    if (typeof body.presetId !== "string") throw badRequest("A preset is required.");
    if (typeof body.photoUrl !== "string") throw badRequest("Upload a test photo first.");

    const db = await getDb();
    const preset = await db.getPreset(body.presetId);
    if (!preset) throw badRequest("Preset not found.");

    const publicPreset = sanitisePreset(preset);

    /*
     * An explicitly named theme always wins here, even when the operator has
     * pinned the step to "fixed". The point of this tool is to try a specific
     * combination — `resolveTheme` alone would silently hand back the pinned
     * theme and quietly test something other than what was asked for.
     */
    const named =
      typeof body.themeId === "string" && body.themeId
        ? publicPreset.themes.find((theme) => theme.id === body.themeId)
        : undefined;
    const theme = named ?? resolveTheme(publicPreset, null) ?? publicPreset.themes[0] ?? null;

    const selected =
      typeof body.customisations === "object" && body.customisations !== null
        ? (body.customisations as Record<string, string>)
        : {};

    const { prompt, imageUrls } = buildPrompt(
      publicPreset,
      { theme, customisations: resolveAllCustomisations(theme, selected) },
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
