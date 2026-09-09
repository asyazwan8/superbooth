"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, EmptyState, PageHeader, Select } from "@/components/admin/ui";
import { DataTable, StatusPill, type Column } from "@/components/ds/dashboard";
import type { Preset, Session, SessionStatus } from "@/lib/schema";

/**
 * Every session, with moderation and export.
 *
 * The two jobs this screen does during a live event are "get that photo off
 * the wall" and "give me the mailing list", so hide and export are the two
 * controls that are always visible, not buried behind a row menu.
 */

const STATUSES: SessionStatus[] = [
  "started",
  "capturing",
  "generating",
  "ready",
  "completed",
  "failed",
  "abandoned",
];

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

  const columns: Column<Session>[] = [
    {
      key: "photo",
      label: "Photo",
      render: (session) => (
        <div
          style={{
            position: "relative",
            height: 64,
            width: 36,
            overflow: "hidden",
            background: "var(--surface-panel-sunk)",
            border: "var(--border-hair) solid var(--line-hard)",
            opacity: session.hidden ? 0.3 : 1,
          }}
        >
          {session.finalUrl ? (
            <Image
              src={session.finalUrl}
              alt=""
              fill
              sizes="36px"
              style={{ objectFit: "cover" }}
              unoptimized
            />
          ) : null}
        </div>
      ),
    },
    {
      key: "guest",
      label: "Guest",
      render: (session) => (
        <>
          <span style={{ display: "block" }}>
            {session.fields.name ?? (session.purgedAt ? "— purged —" : "—")}
          </span>
          <span
            style={{
              display: "block",
              font: "var(--type-meta)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {session.fields.email ?? ""}
          </span>
        </>
      ),
    },
    {
      key: "choices",
      label: "Choices",
      render: (session) =>
        [session.labels.scene, session.labels.pose, session.labels.treatment]
          .filter(Boolean)
          .join(" · ") || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (session) => (
        <>
          <StatusPill status={session.status} />
          {session.error ? (
            <span
              title={session.error}
              style={{
                display: "block",
                marginTop: 4,
                maxWidth: 190,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                font: "var(--type-meta)",
                fontSize: 11,
                color: "var(--state-danger)",
              }}
            >
              {session.error}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: "time",
      label: "Time",
      align: "right",
      render: (session) => {
        const generationMs =
          session.timings.generateStartedAt && session.timings.generateEndedAt
            ? session.timings.generateEndedAt - session.timings.generateStartedAt
            : null;
        return (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {generationMs ? `${(generationMs / 1000).toFixed(1)}s` : "—"}
          </span>
        );
      },
    },
    {
      key: "when",
      label: "When",
      render: (session) => (
        <span style={{ font: "var(--type-meta)", fontSize: 12, whiteSpace: "nowrap" }}>
          {new Date(session.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (session) => (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "var(--space-2)",
          }}
        >
          {session.finalUrl ? (
            <>
              <a
                href={`/p/${session.shortId}`}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: "none" }}
              >
                <Button tone="quiet">View</Button>
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
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="Sessions"
        subtitle={`${filtered.length} of ${sessions.length} shown`}
        action={
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Select
              aria-label="Filter by event"
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              style={{ width: 180 }}
            >
              <option value="">All events</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              style={{ width: 160 }}
            >
              <option value="">Any status</option>
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>

            <a href={exportUrl} download style={{ textDecoration: "none" }}>
              <Button tone="primary">Export CSV</Button>
            </a>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          body="Sessions appear here as guests use the booth. Run the kiosk once to see how a record looks."
        />
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(session) => session.id} />
      )}
    </div>
  );
}
