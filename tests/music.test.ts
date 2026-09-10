import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BoothMusic,
  FADE_MS,
  MUTE_KEY,
  VOLUME_BED,
  VOLUME_DUCKED,
  type AudioLike,
  type StoreLike,
} from "@/lib/booth/music";

/*
 * The music bed, exercised without a DOM.
 *
 * Everything that matters here is about a booth left running unattended for a
 * day: the track surviving resets, the bed getting out of the way of the
 * shutter, and an attendant's mute outliving the page they set it on.
 */

class FakeAudio implements AudioLike {
  loop = false;
  volume = 1;
  plays = 0;
  pauses = 0;
  playing = false;
  /** Set to make `play()` reject, the way a browser refuses without a gesture. */
  refuse = false;

  async play(): Promise<void> {
    if (this.refuse) throw new Error("NotAllowedError");
    this.plays += 1;
    this.playing = true;
  }

  pause(): void {
    this.pauses += 1;
    this.playing = false;
  }
}

class FakeStore implements StoreLike {
  constructor(private data: Record<string, string> = {}) {}
  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.data[key] = value;
  }
}

function build(options: { store?: StoreLike | null; refuse?: boolean } = {}) {
  const created: FakeAudio[] = [];
  const store = options.store === undefined ? new FakeStore() : options.store;
  const music = new BoothMusic({
    createAudio: () => {
      const audio = new FakeAudio();
      audio.refuse = options.refuse ?? false;
      created.push(audio);
      return audio;
    },
    store: () => store,
  });
  return { music, created, store };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("unlocking", () => {
  it("plays on the first gesture and reuses the same element after that", () => {
    const { music, created } = build();

    music.unlock();
    music.unlock();
    music.unlock();

    // One element, not three: a new one per tap would restart the track every
    // time a guest began, which is the bug this whole singleton exists to avoid.
    expect(created).toHaveLength(1);
    expect(created[0].loop).toBe(true);
    expect(created[0].volume).toBe(VOLUME_BED);
  });

  it("survives a browser refusing to play", async () => {
    const { music, created } = build({ refuse: true });

    // A rejected play is the browser declining the gesture, and must not throw
    // into the tap handler — the guest would get an error screen for no reason.
    expect(() => music.unlock()).not.toThrow();
    await vi.runAllTimersAsync();

    expect(created[0].playing).toBe(false);
  });

  it("does not touch audio at all while muted", () => {
    const { music, created } = build({ store: new FakeStore({ [MUTE_KEY]: "true" }) });

    music.unlock();

    // Nothing constructed means nothing fetched: a muted booth never pulls the
    // track over the venue's wifi.
    expect(created).toHaveLength(0);
  });
});

describe("ducking", () => {
  it("fades down for the shutter and back up afterwards", () => {
    const { music, created } = build();
    music.unlock();

    music.duck(true);
    vi.advanceTimersByTime(FADE_MS);
    expect(created[0].volume).toBeCloseTo(VOLUME_DUCKED, 5);

    music.duck(false);
    vi.advanceTimersByTime(FADE_MS);
    expect(created[0].volume).toBeCloseTo(VOLUME_BED, 5);
  });

  it("moves gradually rather than jumping", () => {
    const { music, created } = build();
    music.unlock();

    music.duck(true);
    vi.advanceTimersByTime(FADE_MS / 2);

    const half = created[0].volume;
    expect(half).toBeLessThan(VOLUME_BED);
    expect(half).toBeGreaterThan(VOLUME_DUCKED);
  });

  it("lands on the latest target when ducked and released mid-fade", () => {
    const { music, created } = build();
    music.unlock();

    music.duck(true);
    vi.advanceTimersByTime(FADE_MS / 4);
    music.duck(false);
    vi.advanceTimersByTime(FADE_MS);

    // A guest who backs out of the capture screen mid-countdown must not leave
    // the bed stuck half-down for the rest of the session.
    expect(created[0].volume).toBeCloseTo(VOLUME_BED, 5);
  });

  it("is safe before anything is playing", () => {
    const { music } = build();
    expect(() => music.duck(true)).not.toThrow();
  });
});

describe("muting", () => {
  it("pauses at once and persists for the next page load", () => {
    const store = new FakeStore();
    const { music, created } = build({ store });
    music.unlock();

    music.setMuted(true);

    expect(created[0].pauses).toBe(1);
    expect(store.getItem(MUTE_KEY)).toBe("true");

    // What the attendant set on this device holds after a reload.
    const { music: reloaded } = build({ store });
    expect(reloaded.isMuted()).toBe(true);
  });

  it("starts the track when unmuted before it ever played", () => {
    const { music, created } = build({ store: new FakeStore({ [MUTE_KEY]: "true" }) });

    music.setMuted(false);

    // The tap that unmutes is itself the gesture, so staff do not have to find
    // something else to press before the booth makes a sound.
    expect(created).toHaveLength(1);
    expect(created[0].playing).toBe(true);
  });

  it("notifies subscribers so the attendant button relabels", () => {
    const { music } = build();
    const seen: boolean[] = [];
    const stop = music.subscribe(() => seen.push(music.isMuted()));

    music.setMuted(true);
    music.setMuted(true); // no change, no notification
    music.setMuted(false);

    expect(seen).toEqual([true, false]);

    stop();
    music.setMuted(true);
    expect(seen).toEqual([true, false]);
  });

  it("still works on a device with no storage", () => {
    const { music, created } = build({ store: null });

    expect(music.isMuted()).toBe(false);
    music.unlock();
    music.setMuted(true);

    expect(created[0].pauses).toBe(1);
    expect(music.isMuted()).toBe(true);
  });

  it("defaults to playing when storage throws", () => {
    const throwing: StoreLike = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("SecurityError");
      },
    };
    const { music, created } = build({ store: throwing });

    // Private-mode Safari throws on access rather than returning null.
    expect(music.isMuted()).toBe(false);
    music.unlock();
    expect(() => music.setMuted(true)).not.toThrow();
    expect(created[0].pauses).toBe(1);
  });
});
