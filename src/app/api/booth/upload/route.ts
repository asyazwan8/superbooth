import sharp from "sharp";
import { badRequest, handle, notFound, ok, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { getProvider } from "@/lib/fal/provider";
import { uploadBodySchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Guard against a malformed client sending a huge payload. */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/**
 * The reference photo the model works from. Bigger is not better here — the
 * model reads a face, not a poster — and a smaller upload measurably shortens
 * the guest's wait on venue Wi-Fi.
 */
const REFERENCE_WIDTH = 1080;
const REFERENCE_HEIGHT = 1920;

function decodeDataUrl(dataUrl: string): { bytes: Buffer; contentType: string } {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(dataUrl);
  if (!match) throw badRequest("Expected a base64 JPEG, PNG or WebP data URL.");

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0) throw badRequest("The captured photo was empty.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw badRequest("The captured photo is too large.");

  return { bytes, contentType: match[1] };
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = uploadBodySchema.parse(await readJson(request));
    const db = await getDb();

    const session = await db.getSession(body.sessionId);
    if (!session) throw notFound("Session not found.");

    const { bytes } = decodeDataUrl(body.dataUrl);

    // Normalise before upload: strips EXIF (which can carry GPS coordinates
    // from a phone-based booth), applies orientation, and caps the size.
    const normalised = await sharp(bytes)
      .rotate()
      .resize(REFERENCE_WIDTH, REFERENCE_HEIGHT, { fit: "cover", position: "attention" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const provider = await getProvider();
    const sourceUrl = await provider.upload({
      bytes: normalised,
      contentType: "image/jpeg",
      filename: `${session.shortId}-source.jpg`,
    });

    await db.updateSession(session.id, {
      sourceUrl,
      status: "capturing",
      timings: { ...session.timings, capturedAt: Date.now() },
    });

    return ok({ sourceUrl });
  });
}
