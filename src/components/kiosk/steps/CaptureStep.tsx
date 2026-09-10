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
  /**
   * The stream's own aspect, read once the browser knows it.
   *
   * The preview box is 9:16-ish and a phone's camera is not, so filling the
   * box cropped a landscape frame down to its middle third — the guest saw a
   * close-up of their own face and could not fit themselves in. Sizing the
   * video's box to the stream instead shows the entire frame, which is also
   * exactly what is captured. Starts at 3:4 so the box does not jump on a
   * device that never reports.
   */
  const [aspect, setAspect] = useState(3 / 4);
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
        The area reserved for the picture carries no frame of its own: the
        border belongs to the picture, which is sized to the camera's own
        aspect. Drawing the frame out here instead left a bordered box with
        the stream letterboxed inside it, which reads as a broken layout
        rather than as a photo.
      */}
      <div
        style={{
          flex: 1,
          // Without this the photo refuses to shrink below its content and
          // pushes the footer off a short stage — an operator's laptop, or a
          // kiosk in a browser with chrome.
          minHeight: 0,
          margin: "var(--space-5) var(--booth-gutter) 0",
          containerType: "size",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            /*
             * Fitted to the stream, so `cover` below crops nothing away.
             *
             * The same `min()` pair `BoothFrame` uses, and not `aspect-ratio`,
             * which cannot cap one axis against the other: with a definite
             * width, a max-height clamp resolves both axes and the ratio is
             * dropped. That was harmless only while every stream was landscape
             * in a tall area — a phone reporting a portrait stream would have
             * stretched the frame and cropped the guest.
             */
            width: `min(100cqw, calc(100cqh * ${aspect}))`,
            height: `min(100cqh, calc(100cqw * ${1 / aspect}))`,
            overflow: "hidden",
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
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth && videoHeight) setAspect(videoWidth / videoHeight);
            }}
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
 * Where to stand.
 *
 * Still the vertical oval, but sized for the shot the booth now produces: a
 * head that fills half the frame is a head-and-shoulders photo, and the model
 * is being asked for a full-length portrait. Marking the head near the top and
 * the ground near the bottom tells a guest to step back, which is the only
 * thing that actually puts their outfit and their shoes in the picture — and
 * the less of the body the camera sees, the more of it the model invents.
 *
 * Drawn as a hard dashed gold rule over a vignette rather than a translucent
 * overlay, because on a bright venue screen a soft guide is invisible from
 * where the guest is really standing.
 *
 * The viewBox is portrait and fitted with `meet`, so the marks keep their
 * proportions on any camera: on a wide landscape stream they sit in a narrow
 * column in the middle, which is exactly where a standing person belongs.
 */
function FramingGuide() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(78% 70% at 50% 50%, transparent 62%, rgba(13,7,21,0.7) 100%)",
        }}
      />
      <svg
        viewBox="0 0 60 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
      >
        {/* The head, at the height a standing figure's head sits. */}
        <ellipse
          cx="30"
          cy="14"
          rx="6.4"
          ry="9"
          fill="none"
          stroke="var(--sb-gold)"
          strokeWidth="0.8"
          strokeDasharray="2.6 2"
          opacity="0.85"
        />
        {/* The ground. A guest who gets their head in the oval and their feet
            on this line is standing far enough back to be photographed whole. */}
        <path
          d="M14 95 H46"
          fill="none"
          stroke="var(--sb-gold)"
          strokeWidth="0.8"
          strokeDasharray="2.6 2"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Corner ticks marking the standing column, so the two marks read as
            one frame rather than as two unrelated shapes. */}
        <path
          d="M14 88 V95 H21 M46 88 V95 H39"
          fill="none"
          stroke="var(--sb-gold)"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
    </div>
  );
}
