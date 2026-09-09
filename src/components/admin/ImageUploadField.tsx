"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/admin/ui";

/**
 * Uploads an image and hands back its stored URL.
 *
 * Server-side normalisation means the operator does not have to prepare
 * anything: whatever they drag in is resized and re-encoded for the role it
 * plays (see /api/admin/upload). The preview here shows the *stored* image so
 * they can see what the booth will actually use.
 */
export function ImageUploadField({
  value,
  kind,
  onChange,
  frameStyle = { aspectRatio: "3 / 4", width: "100%" },
  emptyLabel = "Upload image",
}: {
  value: string | null;
  kind: "logo" | "overlay" | "reference";
  onChange: (url: string | null) => void;
  /** Sizing for the preview box. Tall aspects should also cap their height. */
  frameStyle?: CSSProperties;
  emptyLabel?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);

      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed.");

      onChange(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <div
        style={{
          position: "relative",
          margin: "0 auto",
          maxWidth: "100%",
          overflow: "hidden",
          background: "var(--surface-panel-sunk)",
          border: "var(--border-hard) dashed var(--line-hard)",
          ...frameStyle,
        }}
      >
        {value ? (
          <Image src={value} alt="" fill style={{ objectFit: "contain" }} unoptimized />
        ) : (
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
              textAlign: "center",
            }}
          >
            {busy ? "Uploading…" : emptyLabel}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button onClick={() => input.current?.click()} disabled={busy} style={{ flex: 1 }}>
          {value ? "Replace" : "Upload"}
        </Button>
        {value ? (
          <Button tone="danger" onClick={() => onChange(null)} disabled={busy}>
            Clear
          </Button>
        ) : null}
      </div>

      {error ? (
        <p style={{ margin: 0, font: "var(--type-meta)", fontSize: 12, color: "var(--state-danger)" }}>
          {error}
        </p>
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
    </div>
  );
}
