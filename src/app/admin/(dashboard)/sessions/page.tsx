import { SessionsTable } from "@/components/admin/SessionsTable";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const db = await getDb();
  const [sessions, presets] = await Promise.all([
    db.listSessions({ limit: 500 }),
    db.listPresets(),
  ]);

  return <SessionsTable sessions={sessions} presets={presets} />;
}
