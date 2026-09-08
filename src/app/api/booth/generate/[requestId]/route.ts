import { badRequest, handle, notFound, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getProvider } from "@/lib/fal/provider";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Poll a submitted generation.
 *
 * The kiosk calls this every second or so while the "generating" screen is up.
 * Results are recorded on the session the first time they appear, so a poll
 * that arrives after the guest has already moved on is harmless.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  return handle(async () => {
    const { requestId } = await params;
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) throw badRequest("sessionId is required.");

    const db = await getDb();
    const session = await db.getSession(sessionId);
    if (!session) throw notFound("Session not found.");
    // Stops one session's id being used to read another's generation.
    if (session.requestId !== requestId) throw badRequest("Request does not belong to session.");

    // Already recorded — skip the provider round trip entirely.
    if (session.variantUrls.length > 0) {
      return ok({ state: "COMPLETED" as const, images: session.variantUrls });
    }

    const provider = await getProvider();
    const status = await provider.status(requestId);

    if (status.state === "COMPLETED" && status.images?.length) {
      await db.updateSession(session.id, {
        variantUrls: status.images,
        status: "ready",
        timings: { ...session.timings, generateEndedAt: Date.now() },
      });
      return ok({ state: status.state, images: status.images });
    }

    if (status.state === "FAILED") {
      await db.updateSession(session.id, {
        status: "failed",
        error: status.error ?? "Generation failed.",
        timings: { ...session.timings, generateEndedAt: Date.now() },
      });
      return ok({ state: status.state, error: status.error ?? "Generation failed." });
    }

    return ok({ state: status.state, queuePosition: status.queuePosition ?? null });
  });
}
