"use client";

import { useState } from "react";

/**
 * PDPA self-service erasure.
 *
 * The guest who owns the photo can delete it from the same page they
 * downloaded it on, without emailing anyone. Confirmation is a second tap
 * rather than a dialog: on a phone, a stray tap here should not be destructive,
 * but the flow should still be two seconds long.
 */
export function DeleteRequestButton({ shortId }: { shortId: string }) {
  const [stage, setStage] = useState<"idle" | "confirm" | "working" | "done" | "error">("idle");

  const remove = async () => {
    setStage("working");
    try {
      const response = await fetch("/api/booth/delete-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shortId }),
      });
      setStage(response.ok ? "done" : "error");
    } catch {
      setStage("error");
    }
  };

  if (stage === "done") {
    return (
      <p className="text-sm text-ink-400">
        Your photo and details have been deleted. Thank you.
      </p>
    );
  }

  if (stage === "confirm" || stage === "working") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-400">
          Delete your photo, name and email for good? This cannot be undone.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={remove}
            disabled={stage === "working"}
            className="rounded-full bg-danger/15 px-5 py-2.5 text-sm font-semibold text-danger disabled:opacity-50"
          >
            {stage === "working" ? "Deleting…" : "Yes, delete it"}
          </button>
          <button
            type="button"
            onClick={() => setStage("idle")}
            className="rounded-full px-5 py-2.5 text-sm text-ink-400"
          >
            Keep it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setStage("confirm")}
        className="text-sm text-ink-500 underline underline-offset-4"
      >
        Delete my photo and data
      </button>
      {stage === "error" ? (
        <p className="text-sm text-danger">That didn&apos;t work. Please try again.</p>
      ) : null}
    </div>
  );
}
