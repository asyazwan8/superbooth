"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CountdownDigit, StepDots, StepFooter } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          position: "relative",
          flex: 1,
          // Without this the photo refuses to shrink below its content and
          // pushes the footer off a short stage — an operator's laptop, or a
          // kiosk in a browser with chrome.
          minHeight: 0,
          overflow: "hidden",
          margin: "var(--space-5) var(--booth-gutter) 0",
          // Paper, not the house ink rule: these three screens sit on the ink
          // stage, where a black edge round a dark photo is no edge at all.
          border: "var(--border-heavy) solid var(--sb-paper)",
          background: "var(--sb-ink-2)",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            width: "100%",
            objectFit: "cover",
            transform: mirror ? "scaleX(-1)" : undefined,
          }}
        />

        <FramingGuide />

        {state !== "ready" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-4)",
              padding: "var(--booth-gutter)",
              textAlign: "center",
              background: "var(--surface-scrim)",
              color: "var(--text-invert)",
            }}
          >
            {state === "starting" ? (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    border: "var(--border-hard) solid var(--sb-ink-3)",
                    borderTopColor: "var(--sb-green)",
                    borderRadius: "var(--radius-pill)",
                    animation: "sb-spin 900ms linear infinite",
                  }}
                />
                <p
                  style={{
                    margin: 0,
                    font: "var(--type-label)",
                    letterSpacing: "var(--tracking-label)",
                    textTransform: "uppercase",
                    color: "var(--sb-gold)",
                  }}
                >
                  Waking up the camera…
                </p>
              </>
            ) : (
              <>
                <p
                  style={{
                    margin: 0,
                    padding: "6px 20px 8px",
                    background: "var(--sb-pink)",
                    color: "var(--sb-paper)",
                    border: "var(--border-hard) solid var(--line-hard)",
                    boxShadow: "var(--shadow-slam)",
                    transform: "skewX(var(--skew-brand))",
                    fontFamily: "var(--font-display)",
                    fontSize: "6cqi",
                    lineHeight: 1,
                    textTransform: "uppercase",
                  }}
                >
                  <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
                    Camera unavailable
                  </span>
                </p>
                <p style={{ margin: 0, font: "var(--type-body)" }}>{error}</p>
                <Button tone="secondary" onClick={() => void retry()}>
                  Try again
                </Button>
                <p style={{ margin: 0, font: "var(--type-meta)", opacity: 0.7 }}>
                  Or ask an attendant for help.
                </p>
              </>
            )}
          </div>
        ) : null}

        {countdown !== null ? <CountdownDigit value={countdown} /> : null}

        {flash ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "var(--sb-paper)",
              animation: "sb-flash 500ms ease-out forwards",
            }}
          />
        ) : null}
      </div>

      <StepFooter
        onBack={countdown === null ? onBack : undefined}
        dots={<StepDots total={dotsTotal} current={dotsCurrent} />}
        action={
          <Button
            full
            onClick={startCountdown}
            disabled={state !== "ready" || countdown !== null}
          >
            {countdown !== null ? "Hold still…" : "Take photo"}
          </Button>
        }
      />
    </div>
  );
}

/**
 * Where to put your face.
 *
 * An ellipse taller than it is wide, at head proportions: it asks a guest to
 * fill it with their face, which is what sets the distance the prompt then
 * asks the model to render — whole head, headroom, waist-up. Drawn as a hard
 * dashed gold rule over a vignette rather than a translucent overlay, because
 * on a bright venue screen a soft guide is invisible from where the guest is
 * really standing.
 *
 * SVG rather than a CSS ellipse so the shape is fixed rather than derived
 * from the box: `meet` on a portrait viewBox keeps it the same oval whether
 * it is drawn on the booth's 9:16 preview or the shorter, wider one on an
 * operator's laptop. A percentage-sized ellipse would stretch with the box
 * and stop being a face anywhere but the kiosk.
 */
function FramingGuide() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(72% 54% at 50% 38%, transparent 58%, rgba(13,7,21,0.78) 100%)",
        }}
      />
      <svg
        viewBox="0 0 60 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
      >
        {/* Sat above centre: a face filling this leaves the shoulders in
            frame below it rather than cropped at the bottom edge. */}
        <ellipse
          cx="30"
          cy="38"
          rx="15"
          ry="21"
          fill="none"
          stroke="var(--sb-gold)"
          strokeWidth="0.8"
          strokeDasharray="2.6 2"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}
