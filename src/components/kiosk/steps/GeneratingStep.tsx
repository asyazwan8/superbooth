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
    /*
      Three bands, top to bottom: the lockup, the working cluster, and a
      marquee rail. The screen used to be one centred cluster with the top and
      bottom thirds left bare, and simply spreading that cluster out only
      split one hole into two — a wait screen needs something at each edge to
      be composed. The rail is also the honest kind of liveness: it moves
      because the booth is working, and it costs nothing to keep moving if the
      queue is long.
    */
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-10) 0 0",
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

      <SuperLogo height="30cqi" style={{ position: "relative", flexShrink: 0 }} />

      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-6)",
          padding: "var(--space-6) var(--booth-gutter)",
        }}
      >
        <div
          style={{
            background: "var(--sb-pink)",
            color: "var(--sb-paper)",
            border: "var(--border-hard) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam)",
            transform: "skewX(var(--skew-brand))",
            padding: "1.8cqi 4cqi 2.4cqi",
          }}
        >
          <h1
            style={{
              margin: 0,
              transform: "skewX(var(--skew-brand-counter))",
              fontFamily: "var(--font-display)",
              fontSize: "7.2cqi",
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
            margin: 0,
            minHeight: "1.6em",
            font: "var(--type-label)",
            fontSize: "3cqi",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
          }}
        >
          {queuePosition && queuePosition > 0
            ? `Waiting in queue — position ${queuePosition}`
            : MESSAGES[messageIndex]}
        </p>

        {/* The bar sits with the copy it belongs to rather than alone at the
            bottom of the stage, where it read as a stray sliver. */}
        <div style={{ width: "100%", marginTop: "var(--space-2)" }}>
          <ProgressBar value={progress} />
        </div>

        <p
          style={{
            margin: 0,
            font: "var(--type-meta)",
            fontSize: "2.4cqi",
            color: "var(--text-invert-muted)",
          }}
        >
          This usually takes about 20 seconds.
        </p>
      </div>

      <MarqueeRail />
    </div>
  );
}

/**
 * A full-bleed rail of moving type across the foot of the wait screen.
 *
 * Decorative, so it is hidden from the accessibility tree — the live region
 * above already says everything a screen reader needs. The strip is doubled
 * and translated by exactly half its width, which is what makes the loop
 * seamless; `sb-marquee` in the motion tokens does the same for anything else
 * that needs it, and stops under prefers-reduced-motion with the rest.
 */
function MarqueeRail() {
  const words = Array.from({ length: 8 }, (_, index) => (
    <span key={index} style={{ paddingRight: "6cqi" }}>
      Superbooth &#9733; Hold tight &#9733;
    </span>
  ));

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        flexShrink: 0,
        width: "112%",
        overflow: "hidden",
        marginBottom: "var(--space-8)",
        padding: "1.4cqi 0 1.8cqi",
        background: "var(--sb-gold)",
        color: "var(--sb-ink)",
        borderTop: "var(--border-hard) solid var(--line-hard)",
        borderBottom: "var(--border-hard) solid var(--line-hard)",
        transform: "rotate(-3deg)",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "200%",
          whiteSpace: "nowrap",
          font: "var(--type-label)",
          fontSize: "2.6cqi",
          letterSpacing: "var(--tracking-label-wide)",
          textTransform: "uppercase",
          animation: "sb-marquee 14s linear infinite",
        }}
      >
        <span style={{ display: "flex", width: "50%", flexShrink: 0 }}>{words}</span>
        <span style={{ display: "flex", width: "50%", flexShrink: 0 }}>{words}</span>
      </div>
    </div>
  );
}
