"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AttendantMenu } from "@/components/kiosk/AttendantMenu";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { SuperboothLogo } from "@/components/brand/SuperboothLogo";
import { useKioskMode } from "@/hooks/useKioskMode";
import type { PublicPreset } from "@/lib/schema";

/**
 * The idle attract screen.
 *
 * The whole surface is the button. A guest walking up to a booth should not
 * have to find a target, and anything smaller than "tap anywhere" costs
 * conversions in a busy hall. The first tap is also what buys the fullscreen
 * and wake-lock permissions the rest of the session needs — browsers only
 * grant those from a user gesture.
 */
export function AttractScreen({ preset, mock }: { preset: PublicPreset; mock: boolean }) {
  const router = useRouter();
  const { engage } = useKioskMode();
  const [starting, setStarting] = useState(false);

  const start = useCallback(() => {
    if (starting) return;
    setStarting(true);
    void engage();
    router.push("/booth");
  }, [engage, router, starting]);

  return (
    <KioskFrame accent={preset.branding.accent} accentSoft={preset.branding.accentSoft}>
      <AttendantMenu onReset={() => router.refresh()} />

      <button
        type="button"
        onClick={start}
        aria-label={preset.branding.attractSubline}
        className="relative flex h-full w-full flex-col items-center justify-center gap-16 px-10"
      >
        <div className="absolute inset-0 sb-glow" />

        <div className="relative flex flex-col items-center gap-10">
          {preset.branding.logoUrl ? (
            <div className="relative h-40 w-64">
              <Image
                src={preset.branding.logoUrl}
                alt=""
                fill
                className="object-contain"
                unoptimized
                priority
              />
            </div>
          ) : (
            <SuperboothLogo />
          )}

          <h1 className="max-w-sm text-center font-display text-4xl font-semibold leading-tight text-ink-100">
            {preset.branding.attractHeadline}
          </h1>
        </div>

        <div className="relative flex flex-col items-center gap-6">
          <span className="relative flex h-24 w-24 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full border-2 border-accent"
              style={{ animation: "sb-pulse-ring 2.6s ease-out infinite" }}
            />
            <span
              className="absolute inset-0 rounded-full border-2 border-accent"
              style={{ animation: "sb-pulse-ring 2.6s ease-out 1.3s infinite" }}
            />
            <span className="h-16 w-16 rounded-full bg-accent/20 sb-hairline" />
          </span>

          <span className="text-base uppercase tracking-[0.34em] text-ink-300">
            {starting ? "Starting…" : preset.branding.attractSubline}
          </span>
        </div>

        {mock ? (
          <span className="absolute bottom-6 rounded-full bg-warn/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-warn">
            Demo mode — no credits are being spent
          </span>
        ) : null}
      </button>
    </KioskFrame>
  );
}
