import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { loadImageBytes } from "@/lib/image/io";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Streams the finished photo with a download disposition.
 *
 * Linking straight at the storage URL does not work: `<a download>` is ignored
 * cross-origin, so mobile browsers open the image in a tab instead of saving
 * it — and "why can't I save it" is the single most common photobooth support
 * question. Proxying it makes Save reliable everywhere.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const { shortId } = await params;
  const db = await getDb();
  const session = await db.getSessionByShortId(shortId);

  if (!session || !session.finalUrl || session.purgedAt) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bytes = await loadImageBytes(session.finalUrl);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": "image/jpeg",
        "content-disposition": `attachment; filename="superbooth-${shortId}.jpg"`,
        "cache-control": "private, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("The photo could not be retrieved", { status: 502 });
  }
}
