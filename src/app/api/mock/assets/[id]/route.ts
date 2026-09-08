import { NextResponse } from "next/server";
import { falMockEnabled } from "@/lib/env";
import { getAsset } from "@/lib/mock/store";

export const dynamic = "force-dynamic";

/**
 * Serves mock-generated assets back to the browser. Disabled outright when
 * FAL_MOCK is off so a production deployment never exposes a file reader.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!falMockEnabled()) return new NextResponse("Not found", { status: 404 });

  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      "content-type": asset.contentType,
      // Content is addressed by hash, so it is safe to cache hard.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
