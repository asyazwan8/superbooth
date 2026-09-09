"use client";

import { useEffect, useState } from "react";
import { ProgressBar, SuperLogo } from "@/components/ds/booth";

/**
 * The wait.
 *
 * A generation takes roughly 15-30 seconds, which is long enough that a bare
 * spinner reads as a hang. Three things fix that: real queue state from the
 * provider, a progress bar that keeps moving but never reaches 100% until the
 * result actually lands, and copy that changes so the screen is visibly alive.
 */

const MESSAGES = [
  "Reading your photo…",
  "Setting the scene…",
  "Styling the shot…",
  "Adding the finishing touches…",
  "Almost there…",
];

export function GeneratingStep({
  queuePosition,
  elapsedMs,
}: {
  queuePosition: number | null;
  elapsedMs: number;
}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex((index) => (index + 1) % MESSAGES.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, []);

  // Asymptotic progress: fast at first, never quite finishing on its own. It
  // stays honest — the bar only completes when the image is really there.
  const progress = Math.min(94, 100 * (1 - Math.exp(-elapsedMs / 12_000)));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6cqi",
        padding: "var(--booth-gutter)",
        textAlign: "center",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "var(--texture-halftone)",
          backgroundSize: "var(--texture-halftone-size)",
          opacity: 0.2,
          animation: "sb-halftone-drift 2s linear infinite",
        }}
      />

      <SuperLogo height="26cqi" style={{ position: "relative" }} />

      <div
        style={{
          position: "relative",
          background: "var(--sb-pink)",
          color: "var(--sb-paper)",
          border: "var(--border-hard) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          transform: "skewX(var(--skew-brand))",
          padding: "1.6cqi 5cqi 2.2cqi",
        }}
      >
        <h1
          style={{
            margin: 0,
            transform: "skewX(var(--skew-brand-counter))",
            fontFamily: "var(--font-display)",
            fontSize: "7.5cqi",
            lineHeight: 0.92,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          Creating your portrait
        </h1>
      </div>

      <p
        aria-live="polite"
        style={{
          position: "relative",
          margin: 0,
          minHeight: "1.6em",
          font: "var(--type-label)",
          fontSize: "2.6cqi",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "var(--sb-gold)",
        }}
      >
        {queuePosition && queuePosition > 0
          ? `Waiting in queue — position ${queuePosition}`
          : MESSAGES[messageIndex]}
      </p>

      <div style={{ position: "relative", width: "76%" }}>
        <ProgressBar value={progress} />
      </div>

      <p
        style={{
          position: "relative",
          margin: 0,
          font: "var(--type-meta)",
          fontSize: "2.2cqi",
          color: "var(--text-invert-muted)",
        }}
      >
        This usually takes about 20 seconds.
      </p>
    </div>
  );
}
