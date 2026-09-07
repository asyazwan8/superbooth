"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState, Select } from "@/components/admin/ui";
import type { Preset, Session, SessionStatus } from "@/lib/schema";

/**
 * Every session, with moderation and export.
 *
 * The two jobs this screen does during a live event are "get that photo off
 * the wall" and "give me the mailing list", so hide and export are the two
 * controls that are always visible, not buried behind a row menu.
 */

const STATUS_TONE: Record<SessionStatus, string> = {
  completed: "bg-positive/15 text-positive",
  failed: "bg-danger/15 text-danger",
  generating: "bg-accent/15 text-accent-soft",
  ready: "bg-accent/15 text-accent-soft",
  capturing: "bg-ink-700 text-ink-300",
  started: "bg-ink-700 text-ink-300",
  abandoned: "bg-ink-700 text-ink-400",
};

export function SessionsTable({
  sessions,
  presets,
}: {
  sessions: Session[];
  presets: Preset[];
}) {
  const router = useRouter();
  const [presetId, setPresetId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (session) =>
          (!presetId || session.presetId === presetId) && (!status || session.status === status),
      ),
    [sessions, presetId, status],
  );

  const act = async (id: string, request: () => Promise<Response>) => {
    setBusy(id);
    try {
      await request();
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const exportUrl = `/api/admin/sessions?format=csv${presetId ? `&presetId=${presetId}` : ""}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Sessions</h1>
          <p className="mt-1 text-sm text-ink-400">
            {filtered.length} of {sessions.length} shown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={presetId} onChange={(event) => setPresetId(event.target.value)} className="w-44">
            <option value="">All events</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>

          <Select value={status} onChange={(event) => setStatus(event.target.value)} className="w-40">
            <option value="">Any status</option>
            {Object.keys(STATUS_TONE).map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>

          <a href={exportUrl} download>
            <Button tone="primary">Export CSV</Button>
          </a>
        </div>
      </header>

      {filtered.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Sessions appear here as guests use the booth. Run the kiosk once to see how a record looks."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="p-3 font-medium">Photo</th>
                <th className="p-3 font-medium">Guest</th>
                <th className="p-3 font-medium">Choices</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Time</th>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((session) => {
                const generationMs =
                  session.timings.generateStartedAt && session.timings.generateEndedAt
                    ? session.timings.generateEndedAt - session.timings.generateStartedAt
                    : null;

                return (
                  <tr key={session.id} className="border-b border-ink-850 last:border-0">
                    <td className="p-3">
                      <div className="relative h-16 w-9 overflow-hidden rounded-md bg-ink-850">
                        {session.finalUrl ? (
                          <Image
                            src={session.finalUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className={`object-cover ${session.hidden ? "opacity-30" : ""}`}
                            unoptimized
                          />
                        ) : null}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="block text-ink-100">
                        {session.fields.name ?? (session.purgedAt ? "— purged —" : "—")}
                      </span>
                      <span className="block text-xs text-ink-500">{session.fields.email ?? ""}</span>
                    </td>

                    <td className="p-3 text-xs text-ink-400">
                      {[session.labels.scene, session.labels.pose, session.labels.treatment]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_TONE[session.status]}`}
                      >
                        {session.status}
                      </span>
                      {session.error ? (
                        <span className="mt-1 block max-w-48 truncate text-xs text-danger" title={session.error}>
                          {session.error}
                        </span>
                      ) : null}
                    </td>

                    <td className="p-3 text-xs tabular-nums text-ink-400">
                      {generationMs ? `${(generationMs / 1000).toFixed(1)}s` : "—"}
                    </td>

                    <td className="p-3 text-xs text-ink-500">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>

                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        {session.finalUrl ? (
                          <>
                            <a href={`/p/${session.shortId}`} target="_blank" rel="noreferrer">
                              <Button tone="ghost">View</Button>
                            </a>
                            <Button
                              disabled={busy === session.id}
                              onClick={() =>
                                act(session.id, () =>
                                  fetch(`/api/admin/sessions/${session.id}`, {
                                    method: "PATCH",
                                    headers: { "content-type": "application/json" },
                                    body: JSON.stringify({ hidden: !session.hidden }),
                                  }),
                                )
                              }
                            >
                              {session.hidden ? "Unhide" : "Hide"}
                            </Button>
                          </>
                        ) : null}

                        {!session.purgedAt ? (
                          <Button
                            tone="danger"
                            disabled={busy === session.id}
                            onClick={() => {
                              if (!confirm("Permanently delete this guest's photo and details?")) return;
                              void act(session.id, () =>
                                fetch(`/api/admin/sessions/${session.id}`, { method: "DELETE" }),
                              );
                            }}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
