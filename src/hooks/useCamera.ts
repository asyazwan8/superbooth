"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "starting" | "ready" | "denied" | "unavailable";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: CameraState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Front-camera access for the capture step.
 *
 * The stream is torn down whenever the capture step is left — a booth that
 * holds the camera open through the whole session keeps the privacy indicator
 * lit, which guests read (correctly) as being recorded while typing their
 * email.
 */
export function useCamera(enabled: boolean): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      setError("This device has no camera available to the browser.");
      return;
    }

    setState("starting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          // Ask for portrait; browsers that only do landscape return a
          // landscape stream and the capture crop handles it.
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("ready");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState("denied");
        setError("Camera access was blocked. An attendant needs to allow it in the browser.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setState("unavailable");
        setError("No camera was found on this device.");
      } else {
        setState("unavailable");
        setError("The camera could not be started.");
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void start();
    } else {
      stop();
    }
    return stop;
  }, [enabled, start, stop]);

  return { videoRef, state, error, start, stop };
}
