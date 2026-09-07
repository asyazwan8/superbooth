"use client";

import { useEffect, useState } from "react";
import { SuperboothMark } from "@/components/brand/SuperboothLogo";

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
    <div className="relative flex h-full flex-col items-center justify-center px-10 text-center">
      <div className="absolute inset-0 sb-glow" />

      <div className="relative">
        <span className="absolute inset-0 rounded-full border-2 border-accent" style={{ animation: "sb-pulse-ring 2.4s ease-out infinite" }} />
        <SuperboothMark className="h-20 w-20 text-accent" />
      </div>

      <h1 className="relative mt-10 font-display text-3xl font-semibold text-ink-100">
        Creating your portrait
      </h1>

      <p className="relative mt-3 h-6 text-base text-ink-400 transition-opacity duration-300">
        {queuePosition && queuePosition > 0
          ? `Waiting in queue — position ${queuePosition}`
          : MESSAGES[messageIndex]}
      </p>

      <div className="relative mt-10 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-800">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="relative mt-6 text-sm text-ink-600">This usually takes about 20 seconds.</p>
    </div>
  );
}
