import { handle, notFound, ok, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { deleteRequestBodySchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * Guest-initiated erasure from the result page.
 *
 * Knowing the short id is the only credential: it is unguessable, and it is
 * exactly what the guest was handed. Requiring anything more would mean asking
 * them to prove who they are with the very details they are asking us to
 * delete.
 *
 * The record is redacted rather than dropped so the consent trail — that
 * someone consented under version X, and later withdrew — survives, which is
 * what a PDPA audit actually asks to see.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { shortId } = deleteRequestBodySchema.parse(await readJson(request));

    const db = await getDb();
    const session = await db.getSessionByShortId(shortId);
    if (!session) throw notFound("That photo could not be found.");

    if (session.purgedAt) return ok({ purged: true });

    await db.updateSession(session.id, {
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
