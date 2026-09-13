"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { boothMusic } from "@/lib/booth/music";

/**
 * React's view of the music bed.
 *
 * The controller lives outside the tree (see lib/booth/music), so this is only
 * a subscription: it reads the mute flag and hands back the two actions the
 * kiosk needs. Nothing here owns the audio element, which is what lets the
 * track survive the navigation between the attract screen and the flow.
 */
export function useBoothMusic(): {
  muted: boolean;
  unlock: () => void;
  setMuted: (muted: boolean) => void;
} {
  const music = boothMusic();

  const muted = useSyncExternalStore(
    useCallback((listener) => music.subscribe(listener), [music]),
    () => music.isMuted(),
    // The server has no device to mute, and rendering "muted" then correcting
    // it on hydration would flash the wrong icon at the attendant.
    () => false,
  );

  return {
    muted,
    unlock: useCallback(() => music.unlock(), [music]),
    setMuted: useCallback((next: boolean) => music.setMuted(next), [music]),
  };
}

/**
 * Duck the bed for as long as this component says so.
 *
 * Written as an effect on a boolean rather than a pair of calls at the call
 * site so the bed always comes back up — including when the guest walks away
 * mid-countdown and the screen unmounts under the idle reset.
 */
export function useMusicDuck(active: boolean): void {
  const music = boothMusic();
  useEffect(() => {
    music.duck(active);
    return () => music.duck(false);
  }, [active, music]);
}
