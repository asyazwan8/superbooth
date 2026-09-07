"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button, Card, Select } from "@/components/admin/ui";
import { estimateCostUsd } from "@/lib/fal/prompt";
import type { Preset } from "@/lib/schema";

/**
 * Runs one real generation from the editor.
 *
 * Prompt writing is guesswork until you see output, and the alternative to
 * this panel is discovering a bad prompt with a guest standing in front of the
 * booth. It also shows the fully assembled prompt, which is usually what
 * explains a surprising result.
 */
export function TestGenerate({ preset, dirty }: { preset: Preset; dirty: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState("");
  const [poseId, setPoseId] = useState("");
  const [treatmentId, setTreatmentId] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setState("uploading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "reference");
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setPhotoUrl(data.url);
      setState("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
      setState("error");
    }
  };

  const run = async () => {
    if (!photoUrl) return;
    setState("running");
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/test-generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          presetId: preset.id,
          photoUrl,
          sceneId: sceneId || null,
          poseId: poseId || null,
          treatmentId: treatmentId || null,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        requestId?: string;
        prompt?: string;
        error?: string;
      };
      if (!response.ok || !data.requestId) throw new Error(data.error ?? "Could not start.");
      setPrompt(data.prompt ?? null);

      // Poll to completion, with the same overall ceiling the booth uses.
      const deadline = Date.now() + 180_000;
      for (;;) {
        if (Date.now() > deadline) throw new Error("Timed out waiting for the result.");
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const poll = await fetch(`/api/admin/generate-status/${data.requestId}`, {
          cache: "no-store",
        });
        const status = (await poll.json().catch(() => ({}))) as {
          state?: string;
          images?: string[];
          error?: string;
        };
        if (status.state === "FAILED") throw new Error(status.error ?? "Generation failed.");
        if (status.state === "COMPLETED" && status.images?.[0]) {
          setResult(status.images[0]);
          setState("done");
          return;
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
      setState("error");
    }
  };

  const busy = state === "running" || state === "uploading";

  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="text-sm font-semibold text-ink-100">Test a generation</h3>
        <p className="mt-0.5 text-xs text-ink-500">
          One real image, about ${estimateCostUsd(1, preset.generation.resolution).toFixed(2)}.
        </p>
      </div>

      {dirty ? (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-xs text-warn">
          Save your changes first — the test runs against the saved preset.
        </p>
      ) : null}

      <div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-dashed border-ink-700 bg-ink-850">
        {result ? (
          <Image src={result} alt="Test result" fill className="object-cover" unoptimized />
        ) : photoUrl ? (
          <Image src={photoUrl} alt="Test photo" fill className="object-cover opacity-50" unoptimized />
        ) : null}

        {state === "running" ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink-950/70 text-xs text-ink-300">
            Generating…
          </span>
        ) : null}
        {!photoUrl && !result ? (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-600">
            Upload a test photo
          </span>
        ) : null}
      </div>

      <Button onClick={() => input.current?.click()} disabled={busy} className="w-full">
        {photoUrl ? "Change photo" : "Choose photo"}
      </Button>

      <div className="grid gap-2">
        <Select value={sceneId} onChange={(event) => setSceneId(event.target.value)}>
          <option value="">Scene — as configured</option>
          {preset.scenes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={poseId} onChange={(event) => setPoseId(event.target.value)}>
          <option value="">Look — as configured</option>
          {preset.poses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select value={treatmentId} onChange={(event) => setTreatmentId(event.target.value)}>
          <option value="">Style — as configured</option>
          {preset.treatments.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Button tone="primary" onClick={run} disabled={!photoUrl || busy || dirty} className="w-full">
        {state === "running" ? "Generating…" : "Run test"}
      </Button>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      {prompt ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPrompt((open) => !open)}
            className="text-xs text-ink-400 underline underline-offset-4 hover:text-ink-100"
          >
            {showPrompt ? "Hide" : "Show"} the prompt that was sent
          </button>
          {showPrompt ? (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3 text-[11px] leading-relaxed text-ink-400">
              {prompt}
            </pre>
          ) : null}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </Card>
  );
}
