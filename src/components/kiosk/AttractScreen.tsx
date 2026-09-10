"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AttendantMenu } from "@/components/kiosk/AttendantMenu";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { SuperLogo } from "@/components/ds/booth";
import { Badge } from "@/components/ds/core";
import { useBoothMusic } from "@/hooks/useBoothMusic";
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
  const { unlock } = useBoothMusic();
  const [starting, setStarting] = useState(false);

  const start = useCallback(() => {
    if (starting) return;
    setStarting(true);
    void engage();
    // The same gesture that buys fullscreen buys audio: browsers refuse both
    // without one. Until someone taps, the booth is silent — unavoidable, and
    // only ever true of the first guest after a page load, since the track
    // then plays on through every reset back to this screen.
    unlock();
    router.push("/booth");
  }, [engage, router, starting, unlock]);

  return (
    <KioskFrame
      ground="purple"
      accent={preset.branding.accent}
      accentSoft={preset.branding.accentSoft}
    >
      <AttendantMenu onReset={() => router.refresh()} />

      <button
        type="button"
        onClick={start}
        aria-label={preset.branding.attractSubline}
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // Even air above, between and below the two elements, rather than
          // a cluster with the slack pushed to the edges. The screen is read
          // from across a hall: two things, both as large as they can be.
          justifyContent: "center",
          gap: "9cqi",
          padding: "var(--space-10) var(--booth-gutter)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <SuperLogo
          src={preset.branding.logoUrl || undefined}
          height="70cqi"
          style={{ position: "relative", maxWidth: "100%" }}
        />

        {/* The headline is a slab that slams in from off-stage: the one piece
            of motion on the screen, and the reason the booth reads as alive
            from across a hall. */}
        <span
          style={{
            position: "relative",
            display: "block",
            background: "var(--sb-gold)",
            color: "var(--sb-ink)",
            border: "var(--border-heavy) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam-lg)",
            transform: "skewX(var(--skew-brand))",
            padding: "2cqi 6cqi 2.6cqi",
            animation: "sb-slam-in var(--dur-slam) var(--ease-snap) both",
          }}
        >
          <span
            style={{
              display: "block",
              transform: "skewX(var(--skew-brand-counter))",
              fontFamily: "var(--font-display)",
              fontSize: "10cqi",
              lineHeight: 0.88,
              letterSpacing: "var(--tracking-display)",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {preset.branding.attractHeadline}
          </span>
        </span>

        {/* The prompt to act, and nothing else. The tap target is the whole
            screen, so a drawn target only competed with the lockup for the
            one glance a passer-by gives the booth. */}
        <span
          style={{
            position: "relative",
            font: "var(--type-label)",
            fontSize: "3cqi",
            letterSpacing: "var(--tracking-label-wide)",
            textTransform: "uppercase",
            textAlign: "center",
            color: "var(--sb-gold)",
            animation: starting ? undefined : "sb-blink 1.4s steps(1, end) infinite",
          }}
        >
          {starting ? "Starting…" : preset.branding.attractSubline}
        </span>

        {mock ? (
          <span style={{ position: "absolute", bottom: "var(--space-6)" }}>
            <Badge tone="warn">Demo mode &mdash; no credits are being spent</Badge>
          </span>
        ) : null}
      </button>
    </KioskFrame>
  );
}
