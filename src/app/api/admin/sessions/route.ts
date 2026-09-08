import { NextResponse } from "next/server";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { sessionsToCsv } from "@/lib/admin/analytics";
import { getDb } from "@/lib/db";
import { sessionStatusSchema } from "@/lib/schema";
import type { SessionQuery } from "@/lib/db/types";

export const dynamic = "force-dynamic";

function parseQuery(url: URL): SessionQuery {
  const status = sessionStatusSchema.safeParse(url.searchParams.get("status"));
  const since = Number(url.searchParams.get("since"));
  const limit = Number(url.searchParams.get("limit"));

  return {
    presetId: url.searchParams.get("presetId") ?? undefined,
    status: status.success ? status.data : undefined,
    since: Number.isFinite(since) && since > 0 ? since : undefined,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 2000) : 500,
  };
}

/**
 * The sessions table, and its CSV export.
 *
 * The export names its columns from the fields the preset actually collects,
 * so an operator who added a "company" field gets it in the CSV without any
 * code change.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin();

    const url = new URL(request.url);
    const db = await getDb();
    const sessions = await db.listSessions(parseQuery(url));

    if (url.searchParams.get("format") === "csv") {
      const keys = [...new Set(sessions.flatMap((session) => Object.keys(session.fields)))];
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(sessionsToCsv(sessions, keys), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="superbooth-sessions-${stamp}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    return ok({ sessions });
  });
}
