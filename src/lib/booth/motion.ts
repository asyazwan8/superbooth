/**
 * The booth's step transitions, expressed in the design system's own timings.
 *
 * Motion is a token in this system the same way colour is — `--dur-snap`,
 * `--dur-slam` and the two hard eases live in `src/styles/tokens/motion.css`
 * and every CSS animation in the booth already uses them. A JS animation
 * library cannot read a custom property, so rather than retyping numbers that
 * would then drift, these are read back off the document once and parsed.
 *
 * The fallbacks mirror the token file exactly, and are what server rendering
 * and unit tests get. They only ever affect how a transition is timed, never
 * what is rendered, so there is nothing for hydration to disagree about.
 */

export interface BoothMotion {
  /** `--dur-snap`, in seconds. */
  snap: number;
  /** `--dur-slam`, in seconds. */
  slam: number;
  /** `--ease-out-hard`, as control points. */
  easeOut: [number, number, number, number];
  /** `--ease-in-hard`, as control points. */
  easeIn: [number, number, number, number];
}

const FALLBACK: BoothMotion = {
  snap: 0.16,
  slam: 0.32,
  easeOut: [0.16, 1, 0.3, 1],
  easeIn: [0.7, 0, 0.84, 0],
};

function raw(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** `320ms` or `0.32s` → seconds. Anything unparseable keeps the fallback. */
function duration(name: string, fallback: number): number {
  const value = raw(name);
  const match = /^(-?[\d.]+)(ms|s)$/.exec(value);
  if (!match) return fallback;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return fallback;
  return match[2] === "ms" ? amount / 1000 : amount;
}

/** `cubic-bezier(a, b, c, d)` → the four control points. */
function easing(
  name: string,
  fallback: [number, number, number, number],
): [number, number, number, number] {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(raw(name));
  if (!match) return fallback;
  const points = match[1].split(",").map((part) => Number(part.trim()));
  if (points.length !== 4 || points.some((point) => !Number.isFinite(point))) return fallback;
  return points as [number, number, number, number];
}

export function readBoothMotion(): BoothMotion {
  return {
    snap: duration("--dur-snap", FALLBACK.snap),
    slam: duration("--dur-slam", FALLBACK.slam),
    easeOut: easing("--ease-out-hard", FALLBACK.easeOut),
    easeIn: easing("--ease-in-hard", FALLBACK.easeIn),
  };
}

/**
 * How far a step slides. A short offset, not a full-width push: every screen
 * already slams its own header slab in from off-stage, and two travelling
 * layers at once reads as a wobble rather than as a step forward.
 */
export const STEP_SHIFT_PERCENT = 7;

/**
 * `--ease-snap` overshoots by design, which is right for a slab landing inside
 * a screen and wrong for the screen itself: past 100% the outgoing edge pulls
 * away from the stage and shows the ground behind it. Steps therefore use the
 * two hard eases — out on the way in, in on the way out.
 */
export function stepVariants(motion: BoothMotion, still: boolean) {
  if (still) {
    return {
      enter: { x: 0, opacity: 1 },
      center: { x: 0, opacity: 1, transition: { duration: 0 } },
      exit: { x: 0, opacity: 1, transition: { duration: 0 } },
    };
  }

  return {
    enter: (direction: number) => ({
      x: `${direction * STEP_SHIFT_PERCENT}%`,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: motion.slam, ease: motion.easeOut },
    },
    exit: (direction: number) => ({
      x: `${direction * -STEP_SHIFT_PERCENT}%`,
      opacity: 0,
      transition: { duration: motion.snap, ease: motion.easeIn },
    }),
  };
}
