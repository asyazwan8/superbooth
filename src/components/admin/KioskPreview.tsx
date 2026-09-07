"use client";

import Image from "next/image";
import { SuperboothLogo } from "@/components/brand/SuperboothLogo";
import { optionsFor, stepSequence, type StepId } from "@/lib/booth/steps";
import type { PublicPreset } from "@/lib/schema";

/**
 * A miniature of the booth beside the editor.
 *
 * It renders from the same preset data the kiosk uses, so branding, copy and
 * which steps survive the flow settings are all visible while editing. The
 * step list underneath is the important half: it answers "what will the guest
 * actually be asked" without walking the booth.
 */
export function KioskPreview({ preset }: { preset: PublicPreset }) {
  const sequence = stepSequence(preset);

  const LABELS: Partial<Record<StepId, string>> = {
    details: "Details & consent",
    scene: "Choose scene",
    pose: "Choose look",
    treatment: "Choose style",
    capture: "Take photo",
    review: "Review & retake",
    generating: "Generating",
    pick: "Pick a variant",
    result: "QR & download",
  };

  return (
    <div className="space-y-4">
      <div
        className="@container relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl border border-ink-800 bg-ink-950"
        style={
          {
            "--sb-accent": preset.branding.accent,
            "--sb-accent-soft": preset.branding.accentSoft,
          } as React.CSSProperties
        }
      >
        <div className="absolute inset-0 sb-glow" />
        <div className="relative flex h-full flex-col items-center justify-center gap-8 px-5 text-center">
          {preset.branding.logoUrl ? (
            <div className="relative h-16 w-32">
              <Image
                src={preset.branding.logoUrl}
                alt=""
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <SuperboothLogo />
          )}

          <p className="font-display text-base font-semibold leading-snug text-ink-100">
            {preset.branding.attractHeadline}
          </p>

          <span className="h-10 w-10 rounded-full bg-accent/25 ring-1 ring-accent" />

          <span className="text-[9px] uppercase tracking-[0.28em] text-ink-400">
            {preset.branding.attractSubline}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-400">
          Guest journey — {sequence.length} screens
        </p>
        <ol className="space-y-1" data-testid="guest-journey">
          {sequence.map((step, index) => {
            const options =
              step === "scene" || step === "pose" || step === "treatment"
                ? optionsFor(preset, step).length
                : null;
            return (
              <li key={step} className="flex items-center gap-2 text-xs text-ink-300">
                <span className="w-4 shrink-0 text-right tabular-nums text-ink-600">
                  {index + 1}
                </span>
                <span>{LABELS[step] ?? step}</span>
                {options !== null ? (
                  <span className="text-ink-600">({options} options)</span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
