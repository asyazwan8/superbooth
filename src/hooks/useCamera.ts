"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "starting" | "ready" | "denied" | "unavailable";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  state: CameraState;
  error: string | null;
  /** Retry after a failure — safe to call from an event handler. */
  retry: () => Promise<void>;
}

/**
 * Front-camera access for the capture step.
 *
 * The stream lives exactly as long as the component that mounts this hook, so
 * leaving the capture step releases the camera. A booth that holds it open for
 * the whole session keeps the recording indicator lit, which guests read —
 * correctly — as being filmed while they type their email address.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const open = useCallback(async () => {
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
          // Ask for portrait; a device that only offers landscape returns one,
          // and the capture crop handles the difference.
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
    const run = async () => {
      // Yield before the first state write so it lands after this effect has
      // committed, instead of cascading a render from inside it.
      await Promise.resolve();
      await open();
    };

    void run();
    return stop;
  }, [open, stop]);

  return { videoRef, state, error, retry: open };
}
