"use client";

import Image from "next/image";
import { useState } from "react";
import { BigButton } from "@/components/kiosk/BigButton";
import { StepHeader } from "@/components/kiosk/StepChrome";

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
    <div className="flex h-full flex-col">
      <StepHeader title="Pick your favourite" subtitle="Tap to compare, then confirm." />

      <div className="relative flex-1 overflow-hidden px-6">
        <div className="relative h-full w-full overflow-hidden rounded-3xl sb-hairline">
          <Image
            key={images[selected]}
            src={images[selected]}
            alt={`Option ${selected + 1}`}
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized
            priority
          />
        </div>
      </div>

      <div className="shrink-0 px-6 pt-4">
        <div className="flex justify-center gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Show option ${index + 1}`}
              aria-pressed={index === selected}
              className={`relative h-24 w-16 overflow-hidden rounded-xl transition
                ${index === selected ? "ring-3 ring-accent" : "opacity-55 sb-hairline"}`}
            >
              <Image src={image} alt="" fill sizes="64px" className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      </div>

      <footer className="shrink-0 space-y-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
        <BigButton className="w-full" onClick={() => onConfirm(selected)} disabled={busy}>
          {busy ? "Preparing your download…" : "Use this one"}
        </BigButton>
        {canRegenerate ? (
          <BigButton variant="ghost" className="w-full" onClick={onRegenerate} disabled={busy}>
            Try again
          </BigButton>
        ) : null}
      </footer>
    </div>
  );
}
