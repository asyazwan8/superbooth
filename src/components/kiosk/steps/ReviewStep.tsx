"use client";

import { StepDots, StepFooter, StepHeader } from "@/components/ds/booth";
import { FittedPhoto } from "@/components/kiosk/FittedPhoto";
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

      {/* The guest's own capture, at the camera's aspect rather than the
          stage's — they are deciding whether to keep this exact frame. */}
      <FittedPhoto
        src={photo}
        alt="Your photo"
        border="var(--border-heavy) solid var(--line-hard)"
        shadow="var(--shadow-slam)"
        areaStyle={{ margin: "0 var(--booth-gutter)" }}
      />

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
