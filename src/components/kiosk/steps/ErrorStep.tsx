"use client";

import { Button } from "@/components/ds/core";

/**
 * The failure screen.
 *
 * A guest should never see a stack trace, a status code, or the word
 * "moderation". They get one sentence about what happened, and two ways
 * forward — try the same photo again, or start over — so nobody is left
 * staring at a dead booth waiting for staff.
 */
export function ErrorStep({
  message,
  onRetry,
  onStartOver,
  busy,
}: {
  message: string;
  onRetry?: () => void;
  onStartOver: () => void;
  busy: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-6)",
        padding: "var(--booth-gutter)",
        textAlign: "center",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          width: 96,
          height: 96,
          background: "var(--sb-gold)",
          color: "var(--sb-ink)",
          border: "var(--border-heavy) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          transform: "skewX(var(--skew-brand))",
          fontFamily: "var(--font-display)",
          fontSize: 54,
          lineHeight: 1,
        }}
      >
        <span style={{ transform: "skewX(var(--skew-brand-counter))" }}>!</span>
      </span>

      <h1
        style={{
          margin: 0,
          padding: "6px 22px 8px",
          background: "var(--sb-pink)",
          color: "var(--sb-paper)",
          border: "var(--border-hard) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          transform: "skewX(var(--skew-brand))",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.5rem, 7cqi, 3rem)",
          lineHeight: 1,
          textTransform: "uppercase",
          fontWeight: 400,
        }}
      >
        <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
          That didn&apos;t work
        </span>
      </h1>

      <p style={{ margin: 0, maxWidth: "30ch", font: "var(--type-lead)" }}>{message}</p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          width: "100%",
        }}
      >
        {onRetry ? (
          <Button full onClick={onRetry} disabled={busy}>
            {busy ? "Trying again…" : "Try again"}
          </Button>
        ) : null}
        <Button full tone="secondary" onClick={onStartOver} disabled={busy}>
          Start over
        </Button>
      </div>
    </div>
  );
}
