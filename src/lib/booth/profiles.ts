/**
 * The screens a kiosk can run on, and what each one changes about the booth.
 *
 * The guest flow is the same everywhere; what differs is the shape of the
 * stage it is fitted to and the routes it lives at. The route says which
 * device it is serving and the shared components read the profile, rather
 * than growing a branch per device.
 */

export type KioskProfileId = "kiosk" | "ipad-air";

export interface KioskProfile {
  id: KioskProfileId;
  /** The attract screen. Every reset — idle, Done, Start over — returns here. */
  home: string;
  /** The guest flow. */
  booth: string;
  /**
   * The band of stage shapes (width / height) the stage may take. Inside it
   * the stage fills the screen; outside it the stage stops at the nearest
   * edge of the band and is letterboxed rather than stretched.
   */
  aspect: { min: number; max: number };
  /** Keep the stage clear of the status bar and the home indicator. */
  safeArea: boolean;
}

export const KIOSK_PROFILES: Record<KioskProfileId, KioskProfile> = {
  /*
   * The 55" vertical screen. Exactly 9:16 and nothing else: the booth is
   * composed for it, and an operator's laptop should show what the hall sees.
   */
  kiosk: {
    id: "kiosk",
    home: "/",
    booth: "/booth",
    aspect: { min: 9 / 16, max: 9 / 16 },
    safeArea: false,
  },

  /*
   * An iPad Air (M1) in portrait — the front camera sits on the top edge that
   * way up, so the guest looks straight down the lens.
   *
   * The screen is 820x1180, which is about 0.72 once the status bar and home
   * indicator are taken off as a Home Screen app, and 0.74–0.78 in Safari
   * depending on which toolbars are showing. A 4:5 ceiling fills the glass in
   * every one of those; turned to landscape the stage stays portrait instead
   * of stretching into a shape nothing was composed for.
   */
  "ipad-air": {
    id: "ipad-air",
    home: "/ipad-air",
    booth: "/ipad-air/booth",
    aspect: { min: 9 / 16, max: 4 / 5 },
    safeArea: true,
  },
};
