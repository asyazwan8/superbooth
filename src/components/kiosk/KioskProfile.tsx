"use client";

import { createContext, useContext } from "react";
import { KIOSK_PROFILES, type KioskProfileId } from "@/lib/booth/profiles";

/**
 * Which screen the booth is running on, for everything under a route that
 * says so. Without a provider the booth is the 9:16 kiosk, so `/` and
 * `/booth` need nothing.
 */
const KioskProfileContext = createContext(KIOSK_PROFILES.kiosk);

/** Takes the id rather than the profile, so a server layout can pass it. */
export function KioskProfileProvider({
  profile,
  children,
}: {
  profile: KioskProfileId;
  children: React.ReactNode;
}) {
  return <KioskProfileContext value={KIOSK_PROFILES[profile]}>{children}</KioskProfileContext>;
}

export function useKioskProfile() {
  return useContext(KioskProfileContext);
}
