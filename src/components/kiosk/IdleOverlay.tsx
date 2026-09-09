"use client";

import { Overlay } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";

/**
 * "Still there?" — shown before an abandoned session is cleared.
 *
 * The grace period exists so a guest who is genuinely reading the consent
 * text isn't ejected mid-sentence, while a booth left alone still returns to
 * the attract screen on its own.
 */
export function IdleOverlay({
  countdown,
  onStay,
  onReset,
}: {
  countdown: number;
  onStay: () => void;
  onReset: () => void;
}) {
  return (
    <Overlay
      title="Still there?"
      body={
        <>
          Starting over in{" "}
          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--sb-gold)" }}>
            {countdown}
          </span>
          s
        </>
      }
    >
      <Button full tone="primary" onClick={onStay}>
        I&apos;m still here
      </Button>
      <Button full tone="quiet" onClick={onReset}>
        Start over
      </Button>
    </Overlay>
  );
}
