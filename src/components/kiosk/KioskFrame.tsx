"use client";

import { useEffect } from "react";

/**
 * The 9:16 stage every kiosk screen renders inside.
 *
 * The booth targets a portrait 9:16 display, but it also has to look right on
 * an operator's laptop during setup, so the stage is fitted to the viewport
 * and letterboxed rather than stretched. The preset's accent colour is applied
 * as a CSS variable here, which is what lets an event rebrand the whole booth
 * without touching a stylesheet.
 */
export function KioskFrame({
  accent,
  accentSoft,
  children,
}: {
  accent: string;
  accentSoft: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.dataset.kiosk = "true";
    return () => {
      delete document.body.dataset.kiosk;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={
        { "--sb-accent": accent, "--sb-accent-soft": accentSoft } as React.CSSProperties
      }
    >
      {/* A container query context: the stage is letterboxed, so its width is
          not the viewport width and type must scale against the stage. */}
      <div
        className="@container relative h-full w-full overflow-hidden bg-ink-950"
        style={{
          maxWidth: "min(100vw, calc(100dvh * 9 / 16))",
          maxHeight: "min(100dvh, calc(100vw * 16 / 9))",
        }}
      >
        {children}
      </div>
    </div>
  );
}
