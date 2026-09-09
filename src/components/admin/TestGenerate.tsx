"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button, Card, SectionTitle, Select } from "@/components/admin/ui";
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
    <Card
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
      }}
    >
      <div>
        <SectionTitle>Test a generation</SectionTitle>
        {/* The cost sits next to the button that spends it, not in a doc: an
            operator should never learn the price after the charge. */}
        <p
          style={{
            margin: "var(--space-3) 0 0",
            font: "var(--type-meta)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          One real image, about ${estimateCostUsd(1, preset.generation.resolution).toFixed(2)}.
        </p>
      </div>

      {dirty ? (
        <p
          style={{
            margin: 0,
            padding: "8px 12px",
            background: "var(--sb-gold)",
            color: "var(--sb-ink)",
            border: "var(--border-hair) solid var(--line-hard)",
            font: "var(--type-body-sm)",
          }}
        >
          Save your changes first — the test runs against the saved preset.
        </p>
      ) : null}

      <div
        style={{
          position: "relative",
          aspectRatio: "9 / 16",
          overflow: "hidden",
          background: "var(--surface-panel-sunk)",
          border: "var(--border-hard) dashed var(--line-hard)",
        }}
      >
        {result ? (
          <Image src={result} alt="Test result" fill style={{ objectFit: "cover" }} unoptimized />
        ) : photoUrl ? (
          <Image
            src={photoUrl}
            alt="Test photo"
            fill
            style={{ objectFit: "cover", opacity: 0.5 }}
            unoptimized
          />
        ) : null}

        {state === "running" ? (
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "var(--surface-scrim)",
              color: "var(--sb-gold)",
              font: "var(--type-label)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
            }}
          >
            Generating…
          </span>
        ) : null}
        {!photoUrl && !result ? (
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              font: "var(--type-label)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Upload a test photo
          </span>
        ) : null}
      </div>

      <Button onClick={() => input.current?.click()} disabled={busy} full>
        {photoUrl ? "Change photo" : "Choose photo"}
      </Button>

      <div style={{ display: "grid", gap: "var(--space-2)" }}>
        <Select
          aria-label="Scene to test"
          value={sceneId}
          onChange={(event) => setSceneId(event.target.value)}
        >
          <option value="">Scene — as configured</option>
          {preset.scenes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Look to test"
          value={poseId}
          onChange={(event) => setPoseId(event.target.value)}
        >
          <option value="">Look — as configured</option>
          {preset.poses.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Style to test"
          value={treatmentId}
          onChange={(event) => setTreatmentId(event.target.value)}
        >
          <option value="">Style — as configured</option>
          {preset.treatments.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Button tone="primary" onClick={run} disabled={!photoUrl || busy || dirty} full>
        {state === "running" ? "Generating…" : "Run test"}
      </Button>

      {error ? (
        <p style={{ margin: 0, font: "var(--type-meta)", fontSize: 12, color: "var(--state-danger)" }}>
          {error}
        </p>
      ) : null}

      {prompt ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPrompt((open) => !open)}
            className="sb-hover"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              font: "var(--type-label)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              color: "var(--text-strong)",
              textDecoration: "underline",
              textDecorationColor: "var(--sb-pink)",
              textUnderlineOffset: 4,
            }}
          >
            {showPrompt ? "Hide" : "Show"} the prompt that was sent
          </button>
          {showPrompt ? (
            <pre
              style={{
                margin: "var(--space-2) 0 0",
                maxHeight: 256,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                padding: "var(--space-3)",
                background: "var(--sb-ink)",
                color: "var(--sb-paper-2)",
                border: "var(--border-hair) solid var(--line-hard)",
                font: "var(--type-meta)",
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              {prompt}
            </pre>
          ) : null}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
    </Card>
  );
}
