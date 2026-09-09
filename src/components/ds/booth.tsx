"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/**
 * Booth primitives, ported from the Superbooth design system.
 *
 * These carry the loudest part of the brand — the slam-in slabs, the -7deg
 * lean, the countdown numeral — because the booth is read from two metres
 * away by someone who has not decided to use it yet.
 */

/* ------------------------------------------------------------------ */
/* BoothFrame                                                          */
/* ------------------------------------------------------------------ */

export type StageGround = "stage" | "menu" | "purple";

const STAGE_GROUNDS: Record<StageGround, CSSProperties> = {
  stage: { background: "var(--surface-stage)", color: "var(--text-invert)" },
  menu: { background: "var(--surface-menu)", color: "var(--text-strong)" },
  purple: { background: "var(--surface-invert)", color: "var(--text-invert)" },
};

/**
 * The 9:16 stage every kiosk screen renders inside.
 *
 * The booth is a 55" vertical screen, but the same build has to look right on
 * an operator's laptop during setup, so the stage is fitted and letterboxed
 * rather than stretched. It is also a container-query context: display type
 * scales against the stage, and a letterboxed stage is not the viewport.
 */
export function BoothFrame({
  ground = "stage",
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { ground?: StageGround }) {
  return (
    // The outer is a SIZE container, which is what lets the stage below size
    // itself from both of its own axes in one formula. Neither percentages nor
    // aspect-ratio can express "cap against the other axis": once width and
    // height are both resolved, aspect-ratio is ignored.
    <div
      style={{
        position: "fixed",
        inset: 0,
        containerType: "size",
        display: "grid",
        placeItems: "center",
        background: "#000",
      }}
      {...rest}
    >
      <div
        style={{
          position: "relative",
          containerType: "inline-size",
          // Fitted, never stretched, in either direction: whichever axis binds
          // wins and the other is derived from it.
          width: "min(100cqw, calc(100cqh * 9 / 16))",
          height: "min(100cqh, calc(100cqw * 16 / 9))",
          overflow: "hidden",
          ...STAGE_GROUNDS[ground],
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SuperLogo                                                           */
/* ------------------------------------------------------------------ */

/**
 * The Superbooth lockup — a supplied raster asset, rendered as-is.
 *
 * The mark is never redrawn, recoloured or reconstructed, and BOOTH is part of
 * the artwork rather than type composed around it. `src` exists so an event
 * preset can swap in its own logo without a code change.
 */
export function SuperLogo({
  src = "/superbooth-logo.png",
  height = "40cqi",
  subline,
  style,
}: {
  src?: string | null;
  height?: string;
  subline?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        ...style,
      }}
    >
      {/* Height is a container unit, so next/image cannot know the box: plain
          img keeps the intrinsic ratio while the stage drives the scale. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src ?? "/superbooth-logo.png"}
        alt="Superbooth"
        style={{ height, width: "auto", display: "block" }}
      />
      {subline ? (
        <span
          style={{
            marginTop: "1.6cqi",
            font: "var(--type-label)",
            fontSize: "2.2cqi",
            letterSpacing: "var(--tracking-label-wide)",
            textTransform: "uppercase",
            textAlign: "center",
            color: "var(--sb-gold)",
          }}
        >
          {subline}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StepHeader                                                          */
/* ------------------------------------------------------------------ */

export type HeaderTone = "purple" | "ink" | "pink" | "paper";

const HEADER_TONES: Record<HeaderTone, CSSProperties> = {
  purple: { background: "var(--sb-purple)", color: "var(--sb-green)" },
  ink: { background: "var(--sb-ink)", color: "var(--sb-gold)" },
  pink: { background: "var(--sb-pink)", color: "var(--sb-paper)" },
  paper: { background: "var(--sb-paper)", color: "var(--sb-ink)" },
};

/**
 * A step's title, set as a skewed slab that slams in from off-stage. The
 * subtitle sits outside the slab so it reads level.
 */
export function StepHeader({
  title,
  subtitle,
  eyebrow,
  tone = "ink",
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  tone?: HeaderTone;
}) {
  return (
    <header
      style={{
        flexShrink: 0,
        padding: "var(--space-6) var(--booth-gutter) var(--space-5)",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            marginBottom: "var(--space-3)",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label-wide)",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          display: "inline-block",
          padding: "8px 24px 10px",
          border: "var(--border-hard) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          transform: "skewX(var(--skew-brand))",
          animation: "sb-slam-in var(--dur-slam) var(--ease-snap) both",
          ...HEADER_TONES[tone],
        }}
      >
        <h1
          style={{
            margin: 0,
            transform: "skewX(var(--skew-brand-counter))",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 7.5cqi, 3.25rem)",
            lineHeight: 0.94,
            letterSpacing: "var(--tracking-display)",
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          {title}
        </h1>
      </div>
      {subtitle ? (
        <p style={{ margin: "var(--space-4) 0 0", font: "var(--type-lead)", maxWidth: "34ch" }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* StepDots + StepFooter                                               */
/* ------------------------------------------------------------------ */

/**
 * Progress across the steps a guest actually works through. Review,
 * generating, pick and result are not counted: showing "5 of 7" while a
 * portrait renders is a lie about who is working.
 */
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          style={{
            height: 14,
            width: index === current ? 44 : 14,
            background: index <= current ? "var(--sb-pink)" : "transparent",
            border: "var(--border-hair) solid var(--line-hard)",
            transform: "skewX(var(--skew-brand))",
            transition:
              "width var(--dur-snap) var(--ease-snap), background var(--dur-snap) linear",
          }}
        />
      ))}
    </div>
  );
}

/** Back, as a hard-bordered square with a chevron glyph set in the display face. */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={onClick}
      style={{
        width: 64,
        height: 64,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--sb-paper)",
        color: "var(--sb-ink)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam-press)",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: 30,
        lineHeight: 1,
        padding: 0,
      }}
    >
      &#8249;
    </button>
  );
}

/**
 * The fixed bottom bar: primary action above, Back and progress below.
 *
 * Back lives in the same place on every screen — that is what makes it
 * trustworthy on a touchscreen — and never where a mis-tap hits the primary
 * action. When Back is unavailable a spacer holds its place so the ticks stay
 * optically centred instead of jumping between steps.
 */
export function StepFooter({
  onBack,
  dots,
  action,
}: {
  onBack?: () => void;
  dots?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <footer
      style={{
        marginTop: "auto",
        flexShrink: 0,
        padding: "var(--space-4) var(--booth-gutter) var(--space-6)",
      }}
    >
      {action ? <div style={{ marginBottom: "var(--space-4)" }}>{action}</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        {onBack ? (
          <BackButton onClick={onBack} />
        ) : (
          <span style={{ width: 64, height: 64, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{dots}</div>
        <span style={{ width: 64, height: 64, flexShrink: 0 }} />
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* OptionCard + OptionGrid                                             */
/* ------------------------------------------------------------------ */

/** Per-index accent, so a grid reads as a colour set rather than a list. */
export const OPTION_ACCENTS = [
  "var(--sb-pink)",
  "var(--sb-cyan)",
  "var(--sb-green)",
  "var(--sb-orange)",
  "var(--sb-violet)",
  "var(--sb-gold)",
];

export interface BoothOptionView {
  id: string;
  label: string;
  imageUrl?: string | null;
}

/**
 * One choosable scene, look or style. Cards carry a preview image when the
 * operator has supplied one and fall back to a flat colour field with the
 * label set large, so a booth is usable before any art exists.
 */
export function OptionCard({
  label,
  imageUrl,
  index = 0,
  selected = false,
  onSelect,
  style,
}: {
  label: string;
  imageUrl?: string | null;
  index?: number;
  selected?: boolean;
  onSelect: () => void;
  style?: CSSProperties;
}) {
  const accent = OPTION_ACCENTS[index % OPTION_ACCENTS.length];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: "100%",
        minHeight: 0,
        // Only applies when the card is not in a height-fitted grid.
        aspectRatio: "3 / 4",
        padding: 0,
        overflow: "hidden",
        textAlign: "left",
        cursor: "pointer",
        background: accent,
        border: `${selected ? "var(--border-heavy)" : "var(--border-hard)"} solid var(--line-hard)`,
        boxShadow: selected ? "var(--shadow-slam)" : "var(--shadow-slam-press)",
        transform: selected ? "translate(-2px, -2px)" : "none",
        transition:
          "transform var(--dur-instant) var(--ease-snap), box-shadow var(--dur-instant) linear",
        ...style,
      }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="45vw"
          style={{ objectFit: "cover" }}
          unoptimized
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "var(--texture-halftone)",
            backgroundSize: "var(--texture-halftone-size)",
            opacity: 0.45,
          }}
        />
      )}

      {/* Label slab, bottom-left, leaning with the brand. */}
      <span
        style={{
          position: "absolute",
          left: -4,
          bottom: 14,
          maxWidth: "94%",
          padding: "6px 18px 8px",
          background: "var(--sb-ink)",
          color: "var(--sb-paper)",
          border: "var(--border-hard) solid var(--line-hard)",
          transform: "skewX(var(--skew-brand))",
        }}
      >
        <span
          style={{
            display: "block",
            transform: "skewX(var(--skew-brand-counter))",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1rem, 3.6cqi, 1.6rem)",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </span>

      {selected ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            background: "var(--sb-green)",
            color: "var(--sb-ink)",
            border: "var(--border-hard) solid var(--line-hard)",
            fontFamily: "var(--font-display)",
            fontSize: 24,
            lineHeight: 1,
          }}
        >
          &#10005;
        </span>
      ) : null}
    </button>
  );
}

/**
 * The choice surface for scenes, looks and styles. Options top out at six by
 * design, so the grid is two columns and never scrolls — a guest should take
 * in every option at a glance rather than discover the good one was below the
 * fold.
 */
export function OptionGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: BoothOptionView[];
  selectedId: string | null;
  onSelect: (option: BoothOptionView) => void;
}) {
  return (
    // Rows share the height rather than being sized by the cards, so the grid
    // fits the stage instead of scrolling. A guest should take in every option
    // at a glance, not discover the good one below the fold — which is also
    // why the count is capped at six.
    <div
      style={{
        display: "grid",
        height: "100%",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridAutoRows: "minmax(0, 1fr)",
        gap: "var(--space-4)",
      }}
    >
      {options.map((option, index) => (
        <OptionCard
          key={option.id}
          index={index}
          label={option.label}
          imageUrl={option.imageUrl}
          selected={option.id === selectedId}
          onSelect={() => onSelect(option)}
          style={{
            animation: `sb-slam-up var(--dur-slam) var(--ease-snap) ${index * 60}ms both`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ProgressBar                                                         */
/* ------------------------------------------------------------------ */

/**
 * The generation bar. Asymptotic by contract: it moves fast at first and never
 * reaches 100% on its own, so it stays honest — the bar only completes when
 * the image is really there.
 */
export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        height: 22,
        width: "100%",
        background: "var(--sb-ink-2)",
        border: "var(--border-hard) solid var(--line-hard)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: "var(--sb-green)",
          backgroundImage: "var(--texture-stripe)",
          transition: "width 700ms var(--ease-out-hard)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CountdownDigit                                                      */
/* ------------------------------------------------------------------ */

/**
 * The capture countdown — the brand's loudest moment. The digit is the whole
 * screen's worth of feedback: it gives a guest time to settle into a pose,
 * which is the difference between a portrait and a photo of someone reaching
 * for a button.
 */
export function CountdownDigit({ value }: { value: number }) {
  const smile = value === 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
      }}
    >
      <span
        key={value}
        style={{
          fontFamily: "var(--font-display)",
          fontSize: smile ? "clamp(3rem, 16cqi, 8rem)" : "clamp(6rem, 42cqi, 22rem)",
          lineHeight: 0.82,
          textTransform: "uppercase",
          color: "var(--sb-gold)",
          WebkitTextStroke: "6px var(--sb-ink)",
          paintOrder: "stroke fill",
          transform: "skewX(var(--skew-brand))",
          animation: smile
            ? "sb-slam-in var(--dur-slam) var(--ease-snap) both"
            : "sb-slam-in 240ms var(--ease-snap) both",
        }}
      >
        {smile ? "Smile!" : value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlay                                                             */
/* ------------------------------------------------------------------ */

/**
 * Full-stage modal for the idle warning and the attendant menu. Covers the
 * whole 9:16 stage — a guest must not be able to keep tapping the screen
 * underneath while the booth is asking whether they are still there.
 */
export function Overlay({
  title,
  body,
  children,
}: {
  title: string;
  body?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={title}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-8)",
        padding: "var(--booth-gutter)",
        textAlign: "center",
        background: "var(--surface-scrim)",
        color: "var(--text-invert)",
        animation: "sb-slam-up var(--dur-snap) var(--ease-out-hard) both",
      }}
    >
      <div>
        <h2
          style={{
            margin: 0,
            display: "inline-block",
            padding: "6px 22px 8px",
            background: "var(--sb-gold)",
            color: "var(--sb-ink)",
            border: "var(--border-hard) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam)",
            transform: "skewX(var(--skew-brand))",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 6cqi, 2.5rem)",
            lineHeight: 1,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
            {title}
          </span>
        </h2>
        {body ? <p style={{ margin: "var(--space-6) 0 0", font: "var(--type-lead)" }}>{body}</p> : null}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QrPanel                                                             */
/* ------------------------------------------------------------------ */

/**
 * The take-it-home block. The QR is the largest element after the photo
 * itself, because a guest holding a phone at arm's length in a crowded hall
 * needs a target they can hit first time.
 */
export function QrPanel({
  qrSrc,
  shareUrl,
  title = "Scan to download",
  body = "Point your phone camera at the code.",
}: {
  qrSrc?: string;
  shareUrl?: string;
  title?: string;
  body?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        padding: "var(--space-5)",
        background: "var(--sb-gold)",
        color: "var(--text-strong)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam)",
      }}
    >
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: 132,
          height: 132,
          padding: 8,
          background: "var(--sb-paper)",
          border: "var(--border-hard) solid var(--line-hard)",
        }}
      >
        {qrSrc ? (
          <Image
            src={qrSrc}
            alt="QR code to download your photo"
            fill
            style={{ objectFit: "contain", padding: 8 }}
            unoptimized
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: "var(--texture-check)",
              backgroundSize: "12px 12px",
            }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: 26,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
        <p style={{ margin: "var(--space-2) 0 0", font: "var(--type-body-sm)" }}>{body}</p>
        {shareUrl ? (
          <p
            style={{
              margin: "var(--space-3) 0 0",
              font: "var(--type-meta)",
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shareUrl}
          </p>
        ) : null}
      </div>
    </div>
  );
}
