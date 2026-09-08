"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Keeps the booth screen awake and, once a guest has interacted, fullscreen.
 *
 * Both APIs require a user gesture or a visible document, so this exposes an
 * `engage` callback the attract screen calls on first tap rather than trying
 * to grab either on mount.
 */
export function useKioskMode(): {
  fullscreen: boolean;
  engage: () => Promise<void>;
  exit: () => Promise<void>;
} {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  // Wake lock is dropped by the browser whenever the tab is hidden, so it is
  // re-acquired on every return to visibility.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // Unsupported or refused (low battery). The booth still works; the
        // screen may just dim, which staff can fix in OS settings.
      }
    };

    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);

  const engage = useCallback(async () => {
    if (document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Refused (iOS Safari has no Fullscreen API on iPhone). Guests still get
      // a working booth; operators should use Guided Access or a kiosk browser.
    }
  }, []);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Nothing useful to do; the attendant can press Escape.
    }
  }, []);

  return { fullscreen, engage, exit };
}
