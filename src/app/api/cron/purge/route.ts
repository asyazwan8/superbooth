import { NextResponse } from "next/server";
import { handle, ok } from "@/lib/api";
import { getDb } from "@/lib/db";
import { cronSecret } from "@/lib/env";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Bounded per run so a large backlog cannot exhaust the function's budget. */
const BATCH = 200;

/**
 * PDPA retention: redacts personal data once a session passes its window.
 *
 * Run daily by Vercel Cron (see vercel.json). Vercel signs its own cron
 * requests with CRON_SECRET; when that is set we require it, so the endpoint
 * cannot be used by anyone else to force an early purge.
 *
 * Records are redacted, not deleted: the consent trail — that someone
 * consented under version X on date Y, and that their data was later purged —
 * is exactly what an audit asks to see.
 */
export async function GET(request: Request) {
  const secret = cronSecret();
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  return handle(async () => {
    const db = await getDb();
    const now = Date.now();
    const due = await db.listPurgeable(now, BATCH);

    for (const session of due) {
      await db.updateSession(session.id, {
        fields: {},
        sourceUrl: null,
        variantUrls: [],
        finalUrl: null,
        hidden: true,
        purgedAt: now,
      });
    }

    return ok({ purged: due.length, remaining: due.length === BATCH });
  });
}
