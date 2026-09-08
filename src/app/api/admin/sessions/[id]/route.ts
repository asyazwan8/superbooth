import { handle, notFound, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Moderation. Hiding pulls a session out of the live gallery while leaving the
 * guest's own link working — the usual case is something inappropriate on a
 * public wall, not a guest who should lose their photo.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const body = (await readJson(request)) as { hidden?: unknown };

    const db = await getDb();
    if (!(await db.getSession(id))) throw notFound("Session not found.");

    const session = await db.updateSession(id, { hidden: Boolean(body.hidden) });
    return ok({ session });
  });
}

/**
 * Full erasure, for a guest who asks staff directly. The record is redacted
 * rather than dropped so the consent trail survives — same reasoning as the
 * guest-facing delete route.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;

    const db = await getDb();
    if (!(await db.getSession(id))) throw notFound("Session not found.");

    await db.updateSession(id, {
      fields: {},
      sourceUrl: null,
      variantUrls: [],
      finalUrl: null,
      hidden: true,
      purgedAt: Date.now(),
    });

    return ok({ purged: true });
  });
}
