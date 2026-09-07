import "server-only";
import sharp from "sharp";
import { loadImageBytes } from "./io";

/**
 * Final-image compositing.
 *
 * Whatever the model returns is normalised to exactly 1080x1920 before the
 * operator's branding overlay goes on top. Normalising first is what lets the
 * overlay be a fixed-size asset the operator can design once in Photoshop —
 * without it, a model that returns 1088x1936 would shift the logo off-centre.
 */

export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;

export interface CompositeOptions {
  imageUrl: string;
  overlayUrl?: string | null;
}

export interface CompositeResult {
  bytes: Buffer;
  width: number;
  height: number;
}

export async function compositeFinalImage({
  imageUrl,
  overlayUrl,
}: CompositeOptions): Promise<CompositeResult> {
  const base = sharp(await loadImageBytes(imageUrl))
    .rotate() // honour EXIF orientation before resizing
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "cover", position: "attention" });

  if (overlayUrl) {
    const overlay = await sharp(await loadImageBytes(overlayUrl))
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "fill" })
      .png()
      .toBuffer();
    base.composite([{ input: overlay, top: 0, left: 0 }]);
  }

  const bytes = await base.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { bytes, width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
}
