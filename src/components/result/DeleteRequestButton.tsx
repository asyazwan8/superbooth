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

const QUIET: React.CSSProperties = {
  margin: 0,
  font: "var(--type-body-sm)",
  color: "var(--text-invert-muted)",
};

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
    return <p style={QUIET}>Your photo and details have been deleted. Thank you.</p>;
  }

  if (stage === "confirm" || stage === "working") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <p style={QUIET}>
          Delete your photo, name and email for good? This cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={remove}
            disabled={stage === "working"}
            style={{
              minHeight: 48,
              padding: "0 20px",
              cursor: stage === "working" ? "default" : "pointer",
              background: "var(--sb-pink)",
              color: "var(--sb-paper)",
              border: "var(--border-hard) solid var(--line-hard)",
              boxShadow: "var(--shadow-slam-press)",
              font: "var(--type-label)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              opacity: stage === "working" ? 0.5 : 1,
            }}
          >
            {stage === "working" ? "Deleting…" : "Yes, delete it"}
          </button>
          <button
            type="button"
            onClick={() => setStage("idle")}
            style={{
              minHeight: 48,
              padding: "0 20px",
              cursor: "pointer",
              background: "transparent",
              color: "var(--text-invert)",
              border: "var(--border-hard) solid currentColor",
              font: "var(--type-label)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
            }}
          >
            Keep it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <button
        type="button"
        onClick={() => setStage("confirm")}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "var(--type-meta)",
          fontSize: 12,
          color: "var(--text-invert-muted)",
          textDecoration: "underline",
          textUnderlineOffset: 4,
        }}
      >
        Delete my photo and data
      </button>
      {stage === "error" ? (
        <p style={{ ...QUIET, color: "var(--sb-pink)" }}>
          That didn&apos;t work. Please try again.
        </p>
      ) : null}
    </div>
  );
}
