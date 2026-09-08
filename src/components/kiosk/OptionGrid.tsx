"use client";

import Image from "next/image";
import type { BoothOption } from "@/lib/schema";

/**
 * The choice surface for scenes, poses and treatments.
 *
 * Options top out at six by design, so the grid is two columns and never
 * scrolls — a guest can take in every option at a glance instead of
 * discovering that the good one was below the fold. Cards carry a preview
 * image when the operator has supplied one and fall back to a typographic
 * tile when they have not, so a booth is usable before any art exists.
 */
export function OptionGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: BoothOption[];
  selectedId: string | null;
  onSelect: (option: BoothOption) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option, index) => {
        const selected = option.id === selectedId;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option)}
            className={`group relative aspect-[3/4] overflow-hidden rounded-3xl text-left
              transition-transform duration-150 active:scale-[0.97]
              ${selected ? "ring-4 ring-accent" : "sb-hairline"}`}
          >
            {option.imageUrl ? (
              <Image
                src={option.imageUrl}
                alt=""
                fill
                sizes="45vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="absolute inset-0 bg-ink-850"
                style={{
                  backgroundImage: `radial-gradient(120% 80% at 50% 0%,
                    color-mix(in oklab, var(--color-accent) ${18 + index * 9}%, transparent),
                    transparent)`,
                }}
              />
            )}

            {/* Scrim keeps the label readable over any uploaded artwork. */}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />

            <span className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-semibold text-white">
              {option.label}
            </span>

            {selected ? (
              <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
