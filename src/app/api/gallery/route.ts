import { handle, ok } from "@/lib/api";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Feeds the public photo wall.
 *
 * Unauthenticated, so the response is trimmed to exactly what a wall needs —
 * an id, an image and a timestamp. Names, emails and consent records never
 * leave the admin side.
 */
export async function GET() {
  return handle(async () => {
    const db = await getDb();
    const sessions = await db.listSessions({
      visibleOnly: true,
      completedOnly: true,
      limit: 60,
    });

    return ok({
      items: sessions
        .filter((session) => session.finalUrl && !session.purgedAt)
        .map((session) => ({
          id: session.id,
          url: session.finalUrl,
          createdAt: session.createdAt,
        })),
    });
  });
}
