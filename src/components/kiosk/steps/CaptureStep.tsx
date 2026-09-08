"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BigButton } from "@/components/kiosk/BigButton";
import { StepDots, StepFooter } from "@/components/kiosk/StepChrome";
import { useCamera } from "@/hooks/useCamera";
import { captureFrame } from "@/lib/booth/capture";

/**
 * Live preview, countdown, shutter.
 *
 * The countdown is the whole point of this screen: it gives the guest time to
 * settle into a pose, and it is the difference between a portrait and a photo
 * of someone reaching for a button. The preview is mirrored so people can
 * frame themselves naturally; the captured frame is not (see lib/booth/capture).
 */
export function CaptureStep({
  countdownSec,
  mirror,
  onCaptured,
  onBack,
  dotsTotal,
  dotsCurrent,
}: {
  countdownSec: number;
  mirror: boolean;
  onCaptured: (dataUrl: string) => void;
  onBack: () => void;
  dotsTotal: number;
  dotsCurrent: number;
}) {
  const { videoRef, state, error, retry } = useCamera();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );

  const shoot = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setFlash(true);
    try {
      onCaptured(captureFrame(video));
    } catch {
      setFlash(false);
      setCountdown(null);
    }
  }, [onCaptured, videoRef]);

  const startCountdown = useCallback(() => {
    if (countdown !== null || state !== "ready") return;

    let remaining = countdownSec;
    setCountdown(remaining);

    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        setCountdown(0);
        timers.current.push(window.setTimeout(shoot, 250));
        return;
      }
      setCountdown(remaining);
      timers.current.push(window.setTimeout(tick, 1000));
    };

    timers.current.push(window.setTimeout(tick, 1000));
  }, [countdown, countdownSec, shoot, state]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          style={mirror ? { transform: "scaleX(-1)" } : undefined}
        />

        {/* Framing guide: a soft vignette plus a head-and-shoulders oval. */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_42%,transparent_55%,rgba(0,0,0,0.72)_100%)]" />
          <div className="absolute left-1/2 top-[30%] h-[34%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/25" />
        </div>

        {state !== "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink-950/90 px-10 text-center">
            {state === "starting" ? (
              <>
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-accent" />
                <p className="text-ink-300">Waking up the camera…</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl text-ink-100">Camera unavailable</p>
                <p className="text-ink-400">{error}</p>
                <BigButton variant="secondary" onClick={() => void retry()}>
                  Try again
                </BigButton>
                <p className="text-sm text-ink-500">Or ask an attendant for help.</p>
              </>
            )}
          </div>
        ) : null}

        {countdown !== null ? (
          <div className="absolute inset-0 flex items-center justify-center">
            {countdown > 0 ? (
              <span
                key={countdown}
                className="font-display text-[9rem] font-bold leading-none text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.6)]"
                style={{ animation: "sb-pulse-ring 900ms var(--ease-booth)" }}
              >
                {countdown}
              </span>
            ) : (
              <span className="font-display text-6xl font-bold text-white">Smile!</span>
            )}
          </div>
        ) : null}

        {flash ? (
          <div
            className="pointer-events-none absolute inset-0 bg-white"
            style={{ animation: "sb-flash 500ms ease-out forwards" }}
          />
        ) : null}
      </div>

      <StepFooter
        onBack={countdown === null ? onBack : undefined}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          <BigButton
            className="w-full"
            onClick={startCountdown}
            disabled={state !== "ready" || countdown !== null}
          >
            {countdown !== null ? "Hold still…" : "Take photo"}
          </BigButton>
        }
      />
    </div>
  );
}
