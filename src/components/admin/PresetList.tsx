"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/admin/ui";
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
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Events</h1>
          <p className="mt-1 text-sm text-ink-400">
            The live event is what the booth shows. Everything else is a draft.
          </p>
        </div>
        <Button tone="primary" onClick={() => create()} disabled={busy !== null}>
          New event
        </Button>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3">
        {presets.map((preset) => (
          <Card
            key={preset.id}
            data-testid="preset-row"
            className="flex items-center gap-4 p-4"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                preset.isActive ? "bg-positive shadow-[0_0_12px] shadow-positive/60" : "bg-ink-700"
              }`}
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/presets/${preset.id}`}
                  className="truncate font-display text-base font-semibold text-ink-100 hover:text-accent"
                >
                  {preset.name}
                </Link>
                {preset.isActive ? (
                  <span className="rounded-full bg-positive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-positive">
                    Live
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-500">
                {preset.scenes.length} scenes · {preset.poses.length} looks ·{" "}
                {preset.treatments.length} styles · {preset.generation.variants} variant
                {preset.generation.variants === 1 ? "" : "s"} at {preset.generation.resolution} ·
                updated {new Date(preset.updatedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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
              <Button onClick={() => create(preset.id)} disabled={busy !== null}>
                Duplicate
              </Button>
              <Link href={`/admin/presets/${preset.id}`}>
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
