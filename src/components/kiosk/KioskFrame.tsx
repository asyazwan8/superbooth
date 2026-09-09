"use client";

import { useEffect } from "react";
import { BoothFrame, type StageGround } from "@/components/ds/booth";

/**
 * The 9:16 stage every kiosk screen renders inside.
 *
 * `BoothFrame` does the letterboxing and the container-query context; this
 * wrapper adds the two things that are the app's business rather than the
 * design system's — marking the body as a kiosk (which is what disables
 * text selection, callouts and overscroll in `tokens/base.css`) and exposing
 * the preset's accent to anything that wants it.
 *
 * The accent deliberately does not repaint the booth chrome. The design
 * system's pairings are contrast-checked; an operator picking a pale accent
 * an hour before doors open should not be able to make the primary button
 * unreadable on a screen nobody is watching.
 */
export function KioskFrame({
  accent,
  accentSoft,
  ground = "stage",
  children,
}: {
  accent: string;
  accentSoft: string;
  ground?: StageGround;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.dataset.kiosk = "true";
    return () => {
      delete document.body.dataset.kiosk;
    };
  }, []);

  return (
    <BoothFrame
      ground={ground}
      style={
        { "--sb-accent": accent, "--sb-accent-soft": accentSoft } as React.CSSProperties
      }
    >
      {children}
    </BoothFrame>
  );
}
