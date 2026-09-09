"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AttendantMenu } from "@/components/kiosk/AttendantMenu";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import { SuperLogo } from "@/components/ds/booth";
import { Badge } from "@/components/ds/core";
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
          justifyContent: "center",
          gap: "7cqi",
          padding: "var(--booth-gutter)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "var(--texture-halftone)",
            backgroundSize: "var(--texture-halftone-size)",
            opacity: 0.28,
          }}
        />

        <SuperLogo
          src={preset.branding.logoUrl || undefined}
          height="42cqi"
          style={{ position: "relative" }}
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

        <span
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4cqi",
          }}
        >
          <span
            style={{
              position: "relative",
              width: "22cqi",
              height: "22cqi",
              display: "grid",
              placeItems: "center",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                border: "var(--border-hard) solid var(--sb-pink)",
                borderRadius: "var(--radius-pill)",
                animation: "sb-ring-pop 2.2s var(--ease-out-hard) infinite",
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                border: "var(--border-hard) solid var(--sb-pink)",
                borderRadius: "var(--radius-pill)",
                animation: "sb-ring-pop 2.2s var(--ease-out-hard) 1.1s infinite",
              }}
            />
            <span
              aria-hidden="true"
              style={{
                width: "13cqi",
                height: "13cqi",
                background: "var(--sb-green)",
                border: "var(--border-hard) solid var(--line-hard)",
                borderRadius: "var(--radius-pill)",
              }}
            />
          </span>

          <span
            style={{
              font: "var(--type-label)",
              fontSize: "2.4cqi",
              letterSpacing: "var(--tracking-label-wide)",
              textTransform: "uppercase",
              color: "var(--sb-gold)",
              animation: starting ? undefined : "sb-blink 1.4s steps(1, end) infinite",
            }}
          >
            {starting ? "Starting…" : preset.branding.attractSubline}
          </span>
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
