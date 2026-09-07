"use client";

import Image from "next/image";
import { BigButton } from "@/components/kiosk/BigButton";
import { StepDots, StepFooter, StepHeader } from "@/components/kiosk/StepChrome";

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
    <div className="flex h-full flex-col">
      <StepHeader title="Happy with this?" subtitle="You can retake it as many times as you like." />

      <div className="relative flex-1 overflow-hidden px-6 pb-4">
        <div className="relative h-full w-full overflow-hidden rounded-3xl sb-hairline">
          {/* A capture is a local data URL, so next/image optimisation is skipped. */}
          <Image src={photo} alt="Your photo" fill sizes="100vw" className="object-cover" unoptimized />
        </div>
      </div>

      <StepFooter
        onBack={onBack}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          <div className="flex gap-3">
            <BigButton variant="secondary" onClick={onRetake} disabled={busy} className="flex-1">
              Retake
            </BigButton>
            <BigButton onClick={onConfirm} disabled={busy} className="flex-[1.4]">
              {busy ? "Sending…" : "Use this photo"}
            </BigButton>
          </div>
        }
      />
    </div>
  );
}
