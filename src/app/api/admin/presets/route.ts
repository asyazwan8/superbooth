import { handle, ok, readJson } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { defaultPreset, getDb } from "@/lib/db";
import { newPresetId } from "@/lib/ids";
import { presetSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireAdmin();
    const db = await getDb();
    return ok({ presets: await db.listPresets() });
  });
}

/**
 * Create a preset, optionally by duplicating an existing one.
 *
 * Duplicating is the common case: an operator running a second event wants
 * last event's scenes and prompts with a new logo, not a blank slate. New
 * presets are always created as drafts so a half-configured booth can never
 * go live by accident.
 */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin();
    const body = (await readJson(request)) as { name?: unknown; duplicateOf?: unknown };
    const db = await getDb();

    const source =
      typeof body.duplicateOf === "string" ? await db.getPreset(body.duplicateOf) : null;

    const now = Date.now();
    const base = source ?? defaultPreset(now);
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : source
          ? `${source.name} (copy)`
          : "New event";

    const preset = presetSchema.parse({
      ...base,
      id: newPresetId(),
      name,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.savePreset(preset);
    return ok({ preset }, { status: 201 });
  });
}
