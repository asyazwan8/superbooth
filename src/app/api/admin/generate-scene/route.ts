import { badRequest, handle, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { buildScenePrompt, estimateCostUsd } from "@/lib/fal/prompt";
import { getProvider } from "@/lib/fal/provider";
import { resolutionSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Generates a backdrop from a text description, for operators who don't have
 * artwork for an event.
 *
 * Text-to-image is fast enough to run synchronously here — this is one
 * operator waiting at a desk, not a guest with a queue behind them, so the
 * polling machinery the booth needs would only add latency.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();

    const body = (await readJson(request)) as { description?: unknown; resolution?: unknown };
    if (typeof body.description !== "string" || body.description.trim().length < 3) {
      throw badRequest("Describe the scene you want in a few words.");
    }

    const resolution = resolutionSchema.catch("2K").parse(body.resolution);
    const provider = await getProvider();
    const url = await provider.textToImage(buildScenePrompt(body.description), resolution);

    return ok({ url, costUsd: estimateCostUsd(1, resolution) });
  });
}
