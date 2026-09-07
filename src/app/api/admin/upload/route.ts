import sharp from "sharp";
import { badRequest, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getProvider } from "@/lib/fal/provider";
import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from "@/lib/image/composite";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Uploads operator artwork — logos, branding overlays, scene and costume
 * references — into the same storage the booth reads from.
 *
 * Each kind is normalised differently: an overlay must be exactly the output
 * size with its alpha channel intact, a logo keeps transparency but is only
 * bounded, and references are flattened to JPEG because the model does not
 * care about their alpha and smaller files upload faster at a venue.
 */
type AssetKind = "logo" | "overlay" | "reference";

const KINDS: AssetKind[] = ["logo", "overlay", "reference"];

async function normalise(kind: AssetKind, bytes: Buffer): Promise<Buffer> {
  const image = sharp(bytes).rotate();

  if (kind === "overlay") {
    // Fixed to the final canvas so the operator's artwork lands exactly where
    // they placed it in their design tool.
    return image.resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: "fill" }).png().toBuffer();
  }
  if (kind === "logo") {
    return image
      .resize(1200, 800, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  }
  return image
    .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "reference") as AssetKind;

    if (!(file instanceof File)) throw badRequest("A file is required.");
    if (!KINDS.includes(kind)) throw badRequest("Unknown asset kind.");
    if (file.size > MAX_BYTES) throw badRequest("That image is larger than 15MB.");
    if (!file.type.startsWith("image/")) throw badRequest("Only image files can be uploaded.");

    const bytes = await normalise(kind, Buffer.from(await file.arrayBuffer()));
    const provider = await getProvider();
    const url = await provider.upload({
      bytes,
      contentType: kind === "reference" ? "image/jpeg" : "image/png",
      filename: `${kind}-${Date.now()}.${kind === "reference" ? "jpg" : "png"}`,
    });

    return ok({ url });
  });
}
