import { badRequest, handle, notFound, ok, readJson } from "@/lib/api";
import { getActivePresetOrDefault, getDb } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getProvider } from "@/lib/fal/provider";
import { compositeFinalImage } from "@/lib/image/composite";
import { renderQrDataUrl } from "@/lib/qr";
import { selectBodySchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Finalise a session: the guest has picked a variant.
 *
 * Compositing happens here rather than at generation time so only the chosen
 * image is processed and stored — one sharp pass and one upload per guest
 * instead of one per variant.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const body = selectBodySchema.parse(await readJson(request));
    const db = await getDb();

    const session = await db.getSession(body.sessionId);
    if (!session) throw notFound("Session not found.");

    const chosen = session.variantUrls[body.index];
    if (!chosen) throw badRequest("That variant is not available.");

    const shareUrl = `${appUrl()}/p/${session.shortId}`;

    // Selecting the same variant twice (a double tap, a retried request)
    // must not produce a second upload.
    if (session.finalUrl && session.selectedIndex === body.index) {
      return ok({
        finalUrl: session.finalUrl,
        shareUrl,
        shortId: session.shortId,
        qrDataUrl: await renderQrDataUrl(shareUrl),
      });
    }

    const preset = await getActivePresetOrDefault();
    const { bytes } = await compositeFinalImage({
      imageUrl: chosen,
      overlayUrl: preset.branding.overlayEnabled ? preset.branding.overlayUrl : null,
    });

    const provider = await getProvider();
    const finalUrl = await provider.upload({
      bytes,
      contentType: "image/jpeg",
      filename: `${session.shortId}.jpg`,
    });

    await db.updateSession(session.id, {
      selectedIndex: body.index,
      finalUrl,
      status: "completed",
      timings: { ...session.timings, completedAt: Date.now() },
    });

    return ok({
      finalUrl,
      shareUrl,
      shortId: session.shortId,
      qrDataUrl: await renderQrDataUrl(shareUrl),
    });
  });
}
