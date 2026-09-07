"use client";

import { BigButton } from "@/components/kiosk/BigButton";

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
    <div
      role="alertdialog"
      aria-label="Are you still there?"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-ink-950/94 px-10 text-center backdrop-blur-sm"
    >
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-100">Still there?</h2>
        <p className="mt-3 text-ink-400">
          Starting over in <span className="tabular-nums text-ink-100">{countdown}</span>s
        </p>
      </div>

      <div className="w-full space-y-3">
        <BigButton className="w-full" onClick={onStay}>
          I&apos;m still here
        </BigButton>
        <BigButton variant="ghost" className="w-full" onClick={onReset}>
          Start over
        </BigButton>
      </div>
    </div>
  );
}
