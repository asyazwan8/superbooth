"use client";

import Image from "next/image";
import { useState } from "react";
import { FittedPhoto } from "@/components/kiosk/FittedPhoto";
import { StepHeader } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";

/**
 * Pick one of the generated variants.
 *
 * Tapping a card enlarges it rather than committing, because at thumbnail size
 * two variants of the same face look nearly identical — the choice is only
 * meaningful once the guest can see the detail.
 */
export function PickStep({
  images,
  onConfirm,
  onRegenerate,
  canRegenerate,
  busy,
}: {
  images: string[];
  onConfirm: (index: number) => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  busy: boolean;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StepHeader
        title="Pick your favourite"
        subtitle="Tap to compare, then confirm."
        tone="purple"
      />

      <FittedPhoto
        src={images[selected]}
        alt={`Option ${selected + 1}`}
        priority
        areaStyle={{ margin: "0 var(--booth-gutter)" }}
      />

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          justifyContent: "center",
          gap: "var(--space-4)",
          padding: "var(--space-5) var(--booth-gutter) 0",
        }}
      >
        {images.map((image, index) => {
          const on = index === selected;
          return (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Show option ${index + 1}`}
              aria-pressed={on}
              style={{
                position: "relative",
                // A 68px chip on a 1080-wide stage is a stamp: the thumbnails
                // are the comparison control, so they scale with the screen
                // and keep the 2:3 crop of the portrait they stand for.
                width: "var(--booth-thumb, 68px)",
                aspectRatio: "68 / 104",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                background: "var(--sb-ink-3)",
                border: `${on ? "var(--border-heavy)" : "var(--border-hard)"} solid var(--line-hard)`,
                boxShadow: on ? "var(--shadow-slam)" : "none",
                opacity: on ? 1 : 0.55,
                transform: on ? "translate(-2px, -2px)" : "none",
                transition: "all var(--dur-instant) var(--ease-snap)",
              }}
            >
              <Image
                src={image}
                alt=""
                fill
                sizes="20vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </button>
          );
        })}
      </div>

      <footer
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "var(--space-5) var(--booth-gutter) var(--space-6)",
        }}
      >
        <Button full onClick={() => onConfirm(selected)} disabled={busy}>
          {busy ? "Preparing your download…" : "Use this one"}
        </Button>
        {canRegenerate ? (
          <Button full tone="ghost" onClick={onRegenerate} disabled={busy}>
            Try again
          </Button>
        ) : null}
      </footer>
    </div>
  );
}
