"use client";

import Image from "next/image";
import { SuperLogo } from "@/components/ds/booth";
import {
  askedCustomisations,
  customisationIndex,
  enabledMoods,
  enabledThemes,
  optionsFor,
  resolveTheme,
  stepSequence,
  type StepId,
} from "@/lib/booth/steps";
import type { PublicPreset } from "@/lib/schema";

/**
 * A miniature of the booth beside the editor.
 *
 * It renders from the same preset data the kiosk uses, so branding, copy and
 * which steps survive the flow settings are all visible while editing. The
 * step list underneath is the important half: it answers "what will the guest
 * actually be asked" without walking the booth.
 */

const LABELS: Partial<Record<StepId, string>> = {
  details: "Details & consent",
  theme: "Choose theme",
  mood: "Choose mood",
  capture: "Take photo",
  review: "Review & retake",
  generating: "Generating",
  pick: "Pick a variant",
  result: "QR & download",
};

export function KioskPreview({ preset }: { preset: PublicPreset }) {
  /*
   * Previewed against the first theme on offer. The journey's length depends
   * on which theme a guest picks, so a single list cannot be the whole truth —
   * this shows the shape of one run rather than claiming to show them all.
   */
  const previewTheme = resolveTheme(preset, enabledThemes(preset)[0]?.id ?? null);
  const asked = askedCustomisations(previewTheme);
  const sequence = stepSequence(preset, previewTheme?.id ?? null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Its own container-query context, so the miniature's type scales with
          the miniature rather than with the editor page around it. */}
      <div
        style={{
          containerType: "inline-size",
          position: "relative",
          margin: "0 auto",
          width: "100%",
          maxWidth: 260,
          aspectRatio: "9 / 16",
          overflow: "hidden",
          background: "var(--surface-invert)",
          border: "var(--border-hard) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "var(--texture-halftone)",
            backgroundSize: "var(--texture-halftone-size)",
            opacity: 0.28,
          }}
        />

        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "7cqi",
            padding: "6cqi",
            textAlign: "center",
            color: "var(--text-invert)",
          }}
        >
          {preset.branding.logoUrl ? (
            <div style={{ position: "relative", height: "18cqi", width: "60cqi" }}>
              <Image
                src={preset.branding.logoUrl}
                alt=""
                fill
                style={{ objectFit: "contain" }}
                unoptimized
              />
            </div>
          ) : (
            <SuperLogo height="34cqi" />
          )}

          <span
            style={{
              display: "block",
              background: "var(--sb-gold)",
              color: "var(--sb-ink)",
              border: "var(--border-hard) solid var(--line-hard)",
              boxShadow: "var(--shadow-slam-press)",
              transform: "skewX(var(--skew-brand))",
              padding: "2cqi 5cqi 2.6cqi",
            }}
          >
            <span
              style={{
                display: "block",
                transform: "skewX(var(--skew-brand-counter))",
                fontFamily: "var(--font-display)",
                fontSize: "9cqi",
                lineHeight: 0.9,
                textTransform: "uppercase",
              }}
            >
              {preset.branding.attractHeadline}
            </span>
          </span>

          <span
            style={{
              font: "var(--type-label)",
              fontSize: "2.6cqi",
              letterSpacing: "var(--tracking-label-wide)",
              textTransform: "uppercase",
              color: "var(--sb-gold)",
            }}
          >
            {preset.branding.attractSubline}
          </span>
        </div>
      </div>

      <div>
        <p
          style={{
            margin: "0 0 var(--space-2)",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
          }}
        >
          Guest journey — {sequence.length} screens
        </p>
        <ol
          data-testid="guest-journey"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {sequence.map((step, index) => {
            const slotIndex = customisationIndex(step);
            const slot = slotIndex === null ? null : asked[slotIndex];
            const options =
              step === "theme"
                ? enabledThemes(preset).length
                : step === "mood"
                  ? enabledMoods(preset).length
                : slot
                  ? optionsFor(slot).length
                  : null;
            return (
              <li
                key={step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  font: "var(--type-body-sm)",
                }}
              >
                <span
                  style={{
                    width: 18,
                    flexShrink: 0,
                    textAlign: "right",
                    font: "var(--type-meta)",
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-invert-muted)",
                  }}
                >
                  {index + 1}
                </span>
                <span>
                  {LABELS[step] ??
                    (customisationIndex(step) !== null
                      ? (asked[customisationIndex(step) as number]?.label ?? "Customisation")
                      : step)}
                </span>
                {options !== null ? (
                  <span
                    style={{
                      font: "var(--type-meta)",
                      fontSize: 11,
                      color: "var(--text-invert-muted)",
                    }}
                  >
                    ({options} options)
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
