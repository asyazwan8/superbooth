import { describe, expect, it } from "vitest";
import { KIOSK_PROFILES } from "@/lib/booth/profiles";

const fits = (aspect: { min: number; max: number }, width: number, height: number) =>
  width / height >= aspect.min && width / height <= aspect.max;

describe("kiosk profiles", () => {
  it("keeps the default kiosk at exactly 9:16", () => {
    expect(KIOSK_PROFILES.kiosk.aspect).toEqual({ min: 9 / 16, max: 9 / 16 });
    expect(KIOSK_PROFILES.kiosk.home).toBe("/");
    expect(KIOSK_PROFILES.kiosk.booth).toBe("/booth");
  });

  it("puts every profile's booth under its own attract screen", () => {
    for (const profile of Object.values(KIOSK_PROFILES)) {
      const prefix = profile.home === "/" ? "/" : `${profile.home}/`;
      expect(profile.booth.startsWith(prefix)).toBe(true);
      expect(profile.aspect.min).toBeLessThanOrEqual(profile.aspect.max);
    }
  });

  it("fills an iPad Air in portrait however it is opened", () => {
    const { aspect } = KIOSK_PROFILES["ipad-air"];
    // Home Screen app; Safari with tabs; Safari with tabs and favourites.
    for (const [width, height] of [
      [820, 1136],
      [820, 1080],
      [820, 1050],
    ]) {
      expect(fits(aspect, width, height)).toBe(true);
    }
    // Landscape is letterboxed to a portrait stage rather than stretched.
    expect(fits(aspect, 1180, 820)).toBe(false);
  });
});
