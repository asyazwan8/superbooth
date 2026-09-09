"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote, PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/ds/core";
import type { Preset } from "@/lib/schema";

/**
 * Event presets.
 *
 * One preset is live at a time and the rest are drafts, which is what lets an
 * operator build next week's event while this week's booth is running. The
 * live one is unmissable, because activating the wrong preset mid-event is the
 * expensive mistake this screen exists to prevent.
 */
export function PresetList({ presets }: { presets: Preset[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (id: string, action: () => Promise<Response>) => {
    setBusy(id);
    setError(null);
    try {
      const response = await action();
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "That didn't work.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  const create = (duplicateOf?: string) =>
    call(duplicateOf ?? "new", async () => {
      const response = await fetch("/api/admin/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(duplicateOf ? { duplicateOf } : {}),
      });
      if (response.ok) {
        const { preset } = (await response.clone().json()) as { preset: Preset };
        router.push(`/admin/presets/${preset.id}`);
      }
      return response;
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <PageHeader
        title="Events"
        subtitle="The live event is what the booth shows. Everything else is a draft."
        action={
          <Button tone="primary" onClick={() => create()} disabled={busy !== null}>
            New event
          </Button>
        }
      />

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {presets.map((preset) => (
          <Card
            key={preset.id}
            data-testid="preset-row"
            ground={preset.isActive ? "gold" : "paper"}
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-4)",
              padding: "var(--space-4)",
            }}
          >
            <div style={{ minWidth: 220, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                <Link
                  href={`/admin/presets/${preset.id}`}
                  className="sb-hover"
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    lineHeight: 1,
                    textTransform: "uppercase",
                  }}
                >
                  {preset.name}
                </Link>
                {preset.isActive ? <Badge tone="invert">Live</Badge> : null}
              </div>
              <p
                style={{
                  margin: "var(--space-2) 0 0",
                  font: "var(--type-meta)",
                  fontSize: 12,
                  opacity: 0.75,
                }}
              >
                {preset.themes.length} theme{preset.themes.length === 1 ? "" : "s"} ·{" "}
                {preset.themes.reduce((total, theme) => total + theme.customisations.length, 0)}{" "}
                customisations · {preset.generation.variants} variant
                {preset.generation.variants === 1 ? "" : "s"} at {preset.generation.resolution} ·
                updated {new Date(preset.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexShrink: 0,
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              {!preset.isActive ? (
                <Button
                  onClick={() =>
                    call(preset.id, () =>
                      fetch(`/api/admin/presets/${preset.id}/activate`, { method: "POST" }),
                    )
                  }
                  disabled={busy !== null}
                >
                  Go live
                </Button>
              ) : null}
              <Button tone="quiet" onClick={() => create(preset.id)} disabled={busy !== null}>
                Duplicate
              </Button>
              <Link href={`/admin/presets/${preset.id}`} style={{ textDecoration: "none" }}>
                <Button tone="primary">Edit</Button>
              </Link>
              {!preset.isActive ? (
                <Button
                  tone="danger"
                  disabled={busy !== null}
                  onClick={() => {
                    if (!confirm(`Delete "${preset.name}"? This cannot be undone.`)) return;
                    void call(preset.id, () =>
                      fetch(`/api/admin/presets/${preset.id}`, { method: "DELETE" }),
                    );
                  }}
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
