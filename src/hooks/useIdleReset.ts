"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Seconds the "still there?" prompt stays up before the booth resets. */
export const IDLE_GRACE_SECONDS = 10;

interface UseIdleResetOptions {
  /** Seconds of inactivity before the warning appears. */
  timeoutSec: number;
  /** Disabled while a generation is in flight, or on the attract screen. */
  enabled: boolean;
  onReset: () => void;
}

interface UseIdleResetResult {
  /** True while the "still there?" prompt should be shown. */
  warning: boolean;
  /** Seconds left before the automatic reset. */
  countdown: number;
  /** Called by the "I'm still here" button. */
  dismiss: () => void;
}

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/**
 * Returns an abandoned session to the attract screen.
 *
 * This is the single most important unattended-booth behaviour: without it the
 * next guest walks up to a stranger's half-filled email form. The warning step
 * exists so a guest who is simply reading the consent text is not thrown out
 * mid-sentence.
 */
export function useIdleReset({
  timeoutSec,
  enabled,
  onReset,
}: UseIdleResetOptions): UseIdleResetResult {
  const [warning, setWarning] = useState(false);
  const [countdown, setCountdown] = useState(IDLE_GRACE_SECONDS);

  // Held in a ref so changing the callback identity does not restart the timer.
  // Assigned in an effect rather than during render, which must stay pure.
  const onResetRef = useRef(onReset);
  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  const dismiss = useCallback(() => {
    setWarning(false);
    setCountdown(IDLE_GRACE_SECONDS);
  }, []);

  // Phase 1: watch for inactivity. The countdown is reset alongside the
  // warning, so the countdown effect below never has to set state on entry.
  useEffect(() => {
    if (!enabled || warning) return;

    const raise = () => {
      setCountdown(IDLE_GRACE_SECONDS);
      setWarning(true);
    };

    let timer = window.setTimeout(raise, timeoutSec * 1000);

    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(raise, timeoutSec * 1000);
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, bump, { passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, bump);
    };
  }, [enabled, warning, timeoutSec]);

  // Phase 2: count down to the reset.
  useEffect(() => {
    if (!warning) return;

    const timer = window.setInterval(() => {
      setCountdown((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          setWarning(false);
          onResetRef.current();
          return IDLE_GRACE_SECONDS;
        }
        return remaining - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [warning]);

  return { warning, countdown, dismiss };
}
