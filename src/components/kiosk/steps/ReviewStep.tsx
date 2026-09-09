"use client";

import Image from "next/image";
import { StepDots, StepFooter, StepHeader } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";

/**
 * Confirm the capture before spending a generation on it.
 *
 * Retake is free; a regeneration is not. Putting this screen between the
 * shutter and the model is the cheapest quality control the booth has — it
 * catches blinks, bad framing and the guest who wasn't ready.
 */
export function ReviewStep({
  photo,
  onRetake,
  onConfirm,
  onBack,
  busy,
  dotsTotal,
  dotsCurrent,
}: {
  photo: string;
  onRetake: () => void;
  onConfirm: () => void;
  onBack: () => void;
  busy: boolean;
  dotsTotal: number;
  dotsCurrent: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StepHeader
        title="Happy with this?"
        subtitle="You can retake it as many times as you like."
        tone="paper"
      />

      <div
        style={{
          position: "relative",
          flex: 1,
          // Without this the photo refuses to shrink below its content and
          // pushes the footer off a short stage — an operator's laptop, or a
          // kiosk in a browser with chrome.
          minHeight: 0,
          overflow: "hidden",
          margin: "0 var(--booth-gutter)",
          border: "var(--border-heavy) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          background: "var(--sb-ink-2)",
        }}
      >
        {/* A capture is a local data URL, so next/image optimisation is skipped. */}
        <Image
          src={photo}
          alt="Your photo"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
          unoptimized
        />
      </div>

      <StepFooter
        onBack={onBack}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button
              tone="quiet"
              onClick={onRetake}
              disabled={busy}
              style={{ flex: 1 }}
            >
              Retake
            </Button>
            <Button onClick={onConfirm} disabled={busy} style={{ flex: 1.4 }}>
              {busy ? "Sending…" : "Use this photo"}
            </Button>
          </div>
        }
      />
    </div>
  );
}
