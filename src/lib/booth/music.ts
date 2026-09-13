/**
 * The booth's background music bed.
 *
 * Deliberately a module-level singleton rather than component state. The
 * journey spans two routes — the attract screen at `/` and the flow at
 * `/booth` — and an `<audio>` element owned by either would be torn down on
 * the navigation between them, restarting the track every time a guest
 * begins and every time the booth resets. One element outside React's tree
 * plays continuously across both, which is what a music bed has to do.
 *
 * Nothing here throws. A booth that cannot play audio (a locked-down browser,
 * a device with no output) is a booth that works silently, not one that shows
 * a guest an error.
 */

/** The bed's resting volume. Loud enough to carry, quiet enough to talk over. */
export const VOLUME_BED = 0.34;
/**
 * Where the bed drops to while the guest is being photographed. The countdown
 * is spoken by the screen and the shutter is the moment the whole session is
 * about; the music getting out of the way is what makes both land.
 */
export const VOLUME_DUCKED = 0.1;
/** Long enough to read as a fade rather than a cut, short enough to feel cued. */
export const FADE_MS = 400;
const FADE_STEPS = 20;

/** Per-device, so an attendant silencing one booth does not silence the rest. */
export const MUTE_KEY = "superbooth:music-muted";

/** The parts of `HTMLAudioElement` this needs, so the logic is testable. */
export interface AudioLike {
  loop: boolean;
  volume: number;
  play(): Promise<void>;
  pause(): void;
}

/** The parts of `Storage` this needs. Either method may throw in private mode. */
export interface StoreLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface MusicDeps {
  /** Called once, on the first unlock, so nothing is fetched before a gesture. */
  createAudio: () => AudioLike;
  /** Null where there is no storage at all; may still throw when there is. */
  store: () => StoreLike | null;
}

export class BoothMusic {
  private audio: AudioLike | null = null;
  private muted: boolean;
  private ducked = false;
  private fade: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly deps: MusicDeps) {
    this.muted = this.readMuted();
  }

  /**
   * Start playing, if a gesture allows it.
   *
   * Browsers refuse audio until the user has interacted with the document, so
   * this is called from the taps that already exist — the attract screen's
   * "tap anywhere" and the details form's Continue — rather than on mount.
   * Calling it again once playing is a no-op, so every tap can call it safely.
   */
  unlock(): void {
    if (this.muted) return;
    if (!this.audio) {
      try {
        this.audio = this.deps.createAudio();
        this.audio.loop = true;
        this.audio.volume = this.target();
      } catch {
        this.audio = null;
        return;
      }
    }
    // A rejected play is the browser declining, not a fault: the guest gets a
    // silent booth and the next tap tries again.
    void this.audio.play().catch(() => undefined);
  }

  /** Drop to the ducked volume while `on`, and back up when it clears. */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.fadeTo(this.target());
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.writeMuted(muted);

    if (muted) {
      this.stopFade();
      this.audio?.pause();
    } else if (this.audio) {
      this.audio.volume = this.target();
      void this.audio.play().catch(() => undefined);
    } else {
      // Muted before anything ever played — a booth started for the first time
      // with the flag already set. Unmuting is itself a tap, so it is the
      // gesture that starts the track.
      this.unlock();
    }
    this.emit();
  }

  /** Subscribe to mute changes. Shaped for `useSyncExternalStore`. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test seam: the volume actually applied to the element. */
  volume(): number {
    return this.audio?.volume ?? 0;
  }

  private target(): number {
    return this.ducked ? VOLUME_DUCKED : VOLUME_BED;
  }

  private fadeTo(target: number): void {
    const audio = this.audio;
    if (!audio) return;
    this.stopFade();

    const from = audio.volume;
    const delta = target - from;
    if (delta === 0) return;

    let step = 0;
    this.fade = setInterval(() => {
      step += 1;
      if (step >= FADE_STEPS) {
        audio.volume = target;
        this.stopFade();
        return;
      }
      audio.volume = from + (delta * step) / FADE_STEPS;
    }, FADE_MS / FADE_STEPS);
  }

  private stopFade(): void {
    if (this.fade === null) return;
    clearInterval(this.fade);
    this.fade = null;
  }

  private readMuted(): boolean {
    try {
      return this.deps.store()?.getItem(MUTE_KEY) === "true";
    } catch {
      // Storage disabled entirely. Default to playing.
      return false;
    }
  }

  private writeMuted(muted: boolean): void {
    try {
      this.deps.store()?.setItem(MUTE_KEY, String(muted));
    } catch {
      // The choice still holds for this session, just not the next one.
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** The track, served from `public/`. */
export const MUSIC_SRC = "/booth-theme.mp3";

/**
 * The one instance the kiosk uses.
 *
 * Constructed lazily so importing this module on the server — which Next does
 * while rendering the kiosk's client components — touches neither `Audio` nor
 * `localStorage`.
 */
let instance: BoothMusic | null = null;

export function boothMusic(): BoothMusic {
  instance ??= new BoothMusic({
    createAudio: () => {
      const audio = new Audio(MUSIC_SRC);
      audio.preload = "auto";
      return audio;
    },
    store: () => (typeof localStorage === "undefined" ? null : localStorage),
  });
  return instance;
}
