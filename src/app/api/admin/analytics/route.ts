import { handle, ok } from "@/lib/api";
import { computeAnalytics } from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/auth";
import { getActivePresetOrDefault, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin();

    const url = new URL(request.url);
    const presetId = url.searchParams.get("presetId") ?? undefined;
    const days = Number(url.searchParams.get("days") ?? 30);
    const since = Number.isFinite(days) && days > 0 ? Date.now() - days * 86_400_000 : undefined;

    const db = await getDb();
    const sessions = await db.listSessions({ presetId, since, limit: 2000 });

    const preset = await getActivePresetOrDefault();
    const costPerImage = preset.generation.resolution === "4K" ? 0.3 : 0.15;

    return ok({ analytics: computeAnalytics(sessions, costPerImage) });
  });
}
