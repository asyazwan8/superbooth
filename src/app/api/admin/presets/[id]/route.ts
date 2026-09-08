import { badRequest, handle, notFound, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { presetSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const preset = await (await getDb()).getPreset(id);
    if (!preset) throw notFound("Preset not found.");
    return ok({ preset });
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const db = await getDb();

    const existing = await db.getPreset(id);
    if (!existing) throw notFound("Preset not found.");

    // The id, live state and creation time are owned by the server: an editor
    // saving a stale form must not be able to flip which preset is live.
    const submitted = (await readJson(request)) as Record<string, unknown>;
    const preset = presetSchema.parse({
      ...submitted,
      id: existing.id,
      isActive: existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: Date.now(),
    });

    await db.savePreset(preset);
    return ok({ preset });
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const db = await getDb();

    const preset = await db.getPreset(id);
    if (!preset) throw notFound("Preset not found.");
    // Deleting the live preset would leave the kiosk with nothing to show.
    if (preset.isActive) throw badRequest("Activate another preset before deleting this one.");

    await db.deletePreset(id);
    return ok({ deleted: true });
  });
}
