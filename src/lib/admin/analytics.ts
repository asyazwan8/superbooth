import type { Session } from "@/lib/schema";

/**
 * Event metrics derived from session records.
 *
 * Computed on read rather than kept as counters: an event is thousands of
 * sessions at most, and derived numbers can never drift out of sync with the
 * records they describe.
 */

export interface OptionCount {
  id: string;
  label: string;
  count: number;
}

export interface Analytics {
  total: number;
  completed: number;
  failed: number;
  abandoned: number;
  completionRate: number;
  /** Median, not mean: one stuck request should not distort the headline. */
  medianGenerationMs: number | null;
  medianSessionMs: number | null;
  perDay: { date: string; total: number; completed: number }[];
  funnel: { step: string; count: number }[];
  scenes: OptionCount[];
  poses: OptionCount[];
  treatments: OptionCount[];
  estimatedSpendUsd: number;
}

const FUNNEL_STAGES = ["Started", "Photo taken", "Generated", "Completed"] as const;

/**
 * How far a session got, as an index into FUNNEL_STAGES.
 *
 * Derived from the timings and status rather than from the stored URLs,
 * because purging clears those — reading the URLs made purged sessions appear
 * to have skipped the middle of the funnel while still counting as completed,
 * which is impossible and made the chart nonsense.
 */
function furthestStage(session: Session): number {
  if (session.status === "completed" || session.timings.completedAt) return 3;

  // "Generated" means images actually came back. A submitted request that
  // failed stops at "Photo taken" — the guest took a photo and got nothing.
  const generated =
    session.variantUrls.length > 0 ||
    (session.timings.generateEndedAt !== null && session.status !== "failed");
  if (generated) return 2;

  if (session.timings.capturedAt || session.sourceUrl || session.timings.generateStartedAt) {
    return 1;
  }
  return 0;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function tally(
  sessions: Session[],
  pick: (session: Session) => { id: string | null; label: string | null },
): OptionCount[] {
  const counts = new Map<string, OptionCount>();
  for (const session of sessions) {
    const { id, label } = pick(session);
    if (!id) continue;
    const existing = counts.get(id);
    if (existing) existing.count += 1;
    else counts.set(id, { id, label: label ?? id, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

export function computeAnalytics(sessions: Session[], costPerImageUsd: number): Analytics {
  const completed = sessions.filter((session) => session.status === "completed");
  const failed = sessions.filter((session) => session.status === "failed");

  // "Abandoned" is anything that never reached a terminal state — the guest
  // walked away, or the idle timer reset the booth mid-session.
  const abandoned = sessions.filter(
    (session) => !["completed", "failed"].includes(session.status),
  );

  const generationTimes = sessions
    .map((session) =>
      session.timings.generateStartedAt && session.timings.generateEndedAt
        ? session.timings.generateEndedAt - session.timings.generateStartedAt
        : null,
    )
    .filter((value): value is number => value !== null && value > 0);

  const sessionTimes = completed
    .map((session) =>
      session.timings.startedAt && session.timings.completedAt
        ? session.timings.completedAt - session.timings.startedAt
        : null,
    )
    .filter((value): value is number => value !== null && value > 0);

  const days = new Map<string, { date: string; total: number; completed: number }>();
  for (const session of sessions) {
    const date = new Date(session.createdAt).toISOString().slice(0, 10);
    const entry = days.get(date) ?? { date, total: 0, completed: 0 };
    entry.total += 1;
    if (session.status === "completed") entry.completed += 1;
    days.set(date, entry);
  }

  const funnel = FUNNEL_STAGES.map((stage, index) => ({
    step: stage,
    count: sessions.filter((session) => furthestStage(session) >= index).length,
  }));

  // Every requested image is billed, including variants the guest rejected and
  // generations that failed after the model ran.
  const images = sessions.reduce((sum, session) => sum + session.imagesGenerated, 0);

  return {
    total: sessions.length,
    completed: completed.length,
    failed: failed.length,
    abandoned: abandoned.length,
    completionRate: sessions.length ? completed.length / sessions.length : 0,
    medianGenerationMs: median(generationTimes),
    medianSessionMs: median(sessionTimes),
    perDay: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    funnel,
    scenes: tally(sessions, (session) => ({ id: session.choices.sceneId, label: session.labels.scene })),
    poses: tally(sessions, (session) => ({ id: session.choices.poseId, label: session.labels.pose })),
    treatments: tally(sessions, (session) => ({
      id: session.choices.treatmentId,
      label: session.labels.treatment,
    })),
    estimatedSpendUsd: Number((images * costPerImageUsd).toFixed(2)),
  };
}

/**
 * CSV export of the collected personal data.
 *
 * Values are prefixed with an apostrophe when they start with a formula
 * character: a name typed as "=cmd" would otherwise execute when the export is
 * opened in Excel.
 */
export function sessionsToCsv(sessions: Session[], fieldKeys: string[]): string {
  const headers = [
    "created_at",
    ...fieldKeys,
    "consent_version",
    "consent_accepted_at",
    "scene",
    "pose",
    "treatment",
    "status",
    "photo_url",
    "share_id",
  ];

  const escape = (value: string): string => {
    const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${guarded.replace(/"/g, '""')}"`;
  };

  const rows = sessions.map((session) =>
    [
      new Date(session.createdAt).toISOString(),
      ...fieldKeys.map((key) => session.fields[key] ?? ""),
      session.consent.version,
      session.consent.acceptedAt ? new Date(session.consent.acceptedAt).toISOString() : "",
      session.labels.scene ?? "",
      session.labels.pose ?? "",
      session.labels.treatment ?? "",
      session.status,
      session.finalUrl ?? "",
      session.shortId,
    ]
      .map((value) => escape(String(value)))
      .join(","),
  );

  return [headers.map(escape).join(","), ...rows].join("\n");
}
