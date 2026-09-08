"use client";

import Image from "next/image";
import { useRef, useState } from "react";
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
  frameClassName = "aspect-[3/4] w-full",
  emptyLabel = "Upload image",
}: {
  value: string | null;
  kind: "logo" | "overlay" | "reference";
  onChange: (url: string | null) => void;
  /** Sizing for the preview box. Tall aspects should also cap their height. */
  frameClassName?: string;
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
    <div className="space-y-2">
      <div
        className={`relative mx-auto max-w-full overflow-hidden rounded-xl border border-dashed border-ink-700 bg-ink-850 ${frameClassName}`}
      >
        {value ? (
          <Image src={value} alt="" fill className="object-contain" unoptimized />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-600">
            {busy ? "Uploading…" : emptyLabel}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => input.current?.click()} disabled={busy} className="flex-1">
          {value ? "Replace" : "Upload"}
        </Button>
        {value ? (
          <Button tone="ghost" onClick={() => onChange(null)} disabled={busy}>
            Clear
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}

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
    </div>
  );
}
