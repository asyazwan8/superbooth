import type { Metadata, Viewport } from "next";
import { Anton, Archivo, Space_Mono } from "next/font/google";
import "./globals.css";

/*
 * Three faces, no more: Anton carries every display slab, Archivo all UI text
 * and buttons, Space Mono the labels and system chatter. Self-hosted through
 * next/font so a booth waking up on venue Wi-Fi is not waiting on Google.
 */
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Superbooth",
  description: "AI photobooth",
};

export const viewport: Viewport = {
  themeColor: "#0d0715",
  // The kiosk runs on a fixed portrait screen; user scaling is a source of
  // stuck-zoom states that need staff to fix.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${archivo.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
