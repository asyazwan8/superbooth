import { badRequest, handle, notFound, ok, readJson } from "@/lib/api";
import { resolveAllCustomisations, resolveTheme } from "@/lib/booth/steps";
import { getActivePresetOrDefault, getDb, sanitisePreset } from "@/lib/db";
import { buildPrompt } from "@/lib/fal/prompt";
import { getProvider } from "@/lib/fal/provider";
import { generateBodySchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Enqueue a generation and return immediately.
 *
 * Submitting rather than waiting keeps this handler under a second: the kiosk
 * polls `/api/booth/generate/[requestId]` for progress. That survives a kiosk
 * refresh mid-generation and keeps the paid request alive even if the browser
 * drops the connection.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = generateBodySchema.parse(await readJson(request));
    const db = await getDb();

    const session = await db.getSession(body.sessionId);
    if (!session) throw notFound("Session not found.");
    if (!session.sourceUrl) throw badRequest("No photo has been captured yet.");

    const preset = await getActivePresetOrDefault();
    if (session.attempts > preset.generation.retryLimit) {
      throw badRequest("No retries remaining for this session.");
    }

    // Re-resolved server-side rather than trusted: a stale or tampered client
    // can name any id, and the operator's pinned theme wins regardless.
    const publicPreset = sanitisePreset(preset);
    const theme = resolveTheme(publicPreset, body.themeId);
    const customisations = resolveAllCustomisations(theme, body.customisations);

    const { prompt, imageUrls } = buildPrompt(
      publicPreset,
      { theme, customisations },
      session.sourceUrl,
    );

    const provider = await getProvider();
    const requestId = await provider.submit({
      prompt,
      imageUrls,
      numImages: preset.generation.variants,
      resolution: preset.generation.resolution,
    });

    await db.updateSession(session.id, {
      requestId,
      status: "generating",
      error: null,
      variantUrls: [],
      selectedIndex: null,
      attempts: session.attempts + 1,
      imagesGenerated: session.imagesGenerated + preset.generation.variants,
      choices: {
        themeId: theme?.id ?? null,
        customisations: Object.fromEntries(
          customisations.map(({ slot, option }) => [slot.id, option.id]),
        ),
      },
      labels: {
        theme: theme?.label ?? null,
        customisations: Object.fromEntries(
          customisations.map(({ slot, option }) => [slot.label, option.label]),
        ),
      },
      timings: { ...session.timings, generateStartedAt: Date.now() },
    });

    return ok({ requestId, variants: preset.generation.variants });
  });
}
