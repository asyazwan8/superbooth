import type { Metadata } from "next";
import { KioskProfileProvider } from "@/components/kiosk/KioskProfile";

/**
 * The booth on an iPad Air, in portrait.
 *
 * The same guest flow as `/` and `/booth`; the profile is what fits the stage
 * to the iPad's screen instead of letterboxing a 9:16 one inside it, and keeps
 * every reset on this route rather than dropping the iPad back onto `/`.
 *
 * The metadata is for running it from the Home Screen, which is how an iPad
 * gets a booth with no address bar: Safari has no fullscreen for a page.
 */
export const metadata: Metadata = {
  manifest: "/ipad-air.webmanifest",
  // The lockup on the purple ground, rather than a screenshot of whichever
  // screen the booth was on when it was added.
  icons: { apple: "/ipad-air-icon.png" },
  appleWebApp: {
    capable: true,
    title: "Superbooth",
    // Opaque, so the page starts below the status bar rather than under it.
    statusBarStyle: "black",
  },
  // Next emits only the unprefixed `mobile-web-app-capable`. iPadOS reads the
  // manifest's `display` from 16.4; an iPad that has not updated still needs
  // Apple's own tag to open the Home Screen icon without Safari's chrome.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default function IpadAirLayout({ children }: { children: React.ReactNode }) {
  return <KioskProfileProvider profile="ipad-air">{children}</KioskProfileProvider>;
}
