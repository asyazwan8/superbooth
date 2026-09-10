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
      {/*
        A circle to stand in, and an oval to put your face in.

        The circle is a GUIDE, not the photograph. `captureFrame` still keeps
        the whole camera frame — see lib/booth/capture — because the model is
        asked for a full-length portrait and the less of the body it can see
        the more it has to invent. So the guest is shown a tighter view than
        is actually taken, on purpose; do not "fix" the mismatch by cropping
        the capture to match.

        Square corners are the house rule and this is the one deliberate
        exception: a circle is what reads as "put your face here" without any
        instructions, and the caption underneath does the rest.
      */}
      <div
        style={{
          flex: 1,
          // Without this the circle refuses to shrink below its content and
          // pushes the footer off a short stage — an operator's laptop, or a
          // kiosk in a browser with chrome.
          minHeight: 0,
          margin: "var(--space-5) var(--booth-gutter) 0",
          containerType: "size",
          display: "grid",
          placeItems: "center",
          gap: "var(--space-5)",
          alignContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            // Square, so the circle is a circle: the smaller axis wins, the
            // same `min()` pair `BoothFrame` uses. `aspect-ratio` cannot cap
            // one axis against the other — once a clamp resolves the second
            // axis the ratio is dropped and the shape distorts.
            width: "min(100cqw, 100cqh)",
            height: "min(100cqw, 100cqh)",
            borderRadius: "50%",
            overflow: "hidden",
            // Paper, not the house ink rule: the ring has to read against the
            // purple ground and against whatever the camera is showing.
            border: "var(--border-heavy) solid var(--sb-paper)",
            background: "var(--sb-purple-deep)",
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

        {/* The instruction the circle is asking for, in the house face. */}
        <p
          style={{
            margin: 0,
            font: "var(--type-button)",
            fontSize: "max(1.125rem, 3.4cqi)",
            letterSpacing: "var(--tracking-button)",
            textAlign: "center",
            color: "var(--text-invert)",
          }}
        >
          {countdown !== null ? "Hold still\u2026" : "Position your face"}
        </p>


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
 * The oval inside the circle.
 *
 * The circle says "this is the camera"; the oval says "your face goes here".
 * Splitting the two is what lets a guest self-correct without reading
 * anything — they can see immediately whether their face is too small, too
 * high, or off to one side.
 *
 * A square viewBox because the circle is square, so the oval keeps its shape
 * whatever size the stage gives it. Dashed and gold rather than a translucent
 * overlay: on a bright venue screen a soft guide is invisible from where the
 * guest is really standing.
 */
function FramingGuide() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Darkens the ring outside the oval, so the eye is pulled to the
          middle without anything being hidden. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(46% 60% at 50% 48%, transparent 68%, rgba(13,7,21,0.5) 100%)",
        }}
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
      >
        <ellipse
          cx="50"
          cy="48"
          rx="26"
          ry="35"
          fill="none"
          stroke="var(--sb-paper)"
          strokeWidth="2.4"
          strokeDasharray="5 4.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
