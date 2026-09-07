import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { computeAnalytics } from "@/lib/admin/analytics";
import { getActivePresetOrDefault, getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

/** Kept out of the component body so render stays free of impure calls. */
function windowStart(): number {
  return Date.now() - WINDOW_DAYS * 86_400_000;
}

export default async function AnalyticsPage() {
  const db = await getDb();
  const sessions = await db.listSessions({ since: windowStart(), limit: 2000 });

  const preset = await getActivePresetOrDefault();
  const costPerImage = preset.generation.resolution === "4K" ? 0.3 : 0.15;

  return (
    <AnalyticsDashboard
      analytics={computeAnalytics(sessions, costPerImage)}
      windowDays={WINDOW_DAYS}
    />
  );
}
