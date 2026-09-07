import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Make one preset live. The driver deactivates the others atomically. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    await requireAdmin();
    const { id } = await params;
    const db = await getDb();
    await db.setActivePreset(id);
    return ok({ activated: id });
  });
}
