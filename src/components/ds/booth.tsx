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

/**
 * Structural sizing, re-expressed against the stage.
 *
 * The stage is a container-query context and type already scales with `cqi`,
 * but the *structure* around it — tap targets, gutters, stack gaps, the
 * progress bar — was fixed px. On the real 1080x1920 kiosk the stage is twice
 * the width of a laptop preview, so type doubled while every box stayed put
 * and the difference came out as dead space. These re-declare the same custom
 * properties on the stage so they scale with it.
 *
 * `max(token, Ncqi)` keeps the design system's px as a floor: the coefficients
 * are calibrated so each value equals its token exactly at a 480px stage, is
 * clamped to the token below that (an operator's small preview, a phone-sized
 * E2E viewport) and grows from there. Nothing here edits src/styles/tokens —
 * this is the booth layer overriding inherited values for its own subtree,
 * which is the only place the kiosk's proportions are anyone's business.
 *
 * Declared on the stage rather than inside it on purpose: custom properties
 * inherit as unresolved values, so the `cqi` in each one is resolved by the
 * descendant that uses it, against the stage it sits in.
 */
const BOOTH_SCALE = {
  "--tap-min": "max(64px, 13.3cqi)",
  "--booth-gutter": "max(28px, 5.8cqi)",
  "--booth-stack": "max(24px, 5cqi)",
  "--space-4": "max(16px, 3.3cqi)",
  "--space-5": "max(20px, 4.2cqi)",
  "--space-6": "max(24px, 5cqi)",
  "--space-8": "max(32px, 6.7cqi)",
  "--space-10": "max(40px, 8.3cqi)",
  "--space-12": "max(48px, 10cqi)",

  /* Booth-only structure the token set has no name for. Each is read with a
     fallback at its call site, so the component still renders correctly
     outside a stage — the operator's preview, a unit test, Storybook. */
  "--booth-bar": "max(22px, 6cqi)", /* deliberately heavier than the 22px floor */
  "--booth-thumb": "max(68px, 15cqi)",
  "--booth-mark": "max(96px, 20cqi)",
} as CSSProperties;

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
          ...BOOTH_SCALE,
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
            // Ticks scale with the stage too: a 14px mark is a smudge on a
            // 55" screen read from two metres away.
            height: "max(14px, 2.9cqi)",
            width: index === current ? "max(44px, 9.2cqi)" : "max(14px, 2.9cqi)",
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
        width: "var(--tap-min)",
        height: "var(--tap-min)",
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        background: "var(--sb-paper)",
        color: "var(--sb-ink)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam-press)",
        cursor: "pointer",
        fontFamily: "var(--font-display)",
        fontSize: "clamp(1.875rem, 6.2cqi, 3.5rem)",
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
          <span style={{ width: "var(--tap-min)", height: "var(--tap-min)", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{dots}</div>
        <span style={{ width: "var(--tap-min)", height: "var(--tap-min)", flexShrink: 0 }} />
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
 * One choosable scene, look or style.
 *
 * Cards carry a preview image when the operator has supplied one. When they
 * have not — which is every booth on the morning of setup, and plenty of them
 * at doors — the card is *composed* rather than left blank: the accent field
 * carries the option's own name set huge as outlined display type, a stripe
 * and halftone pass to give the colour some tooth, and a mono ordinal tag.
 * The solid label slab stays on top of both variants so legibility never
 * depends on the treatment underneath it.
 */
function OptionFallback({ label, index }: { label: string; index: number }) {
  return (
    <>
      {/* Texture pass. Two layers, both hard-edged: the house has no blur. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "var(--texture-halftone)",
          backgroundSize: "var(--texture-halftone-size)",
          opacity: 0.42,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "var(--texture-stripe)",
        }}
      />

      {/* The option's own name, oversized and outlined, filling the field
          behind the solid label slab. Decorative and duplicated by that slab,
          so it is hidden from the accessibility tree — a card must announce
          its label once. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          padding: "var(--space-4)",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.5rem, 7.5cqi, 3.5rem)",
          lineHeight: 0.86,
          letterSpacing: "var(--tracking-display)",
          textTransform: "uppercase",
          color: "transparent",
          WebkitTextStroke: "2px var(--sb-ink)",
          opacity: 0.5,
          transform: "skewX(var(--skew-brand))",
          overflowWrap: "anywhere",
        }}
      >
        {label}
      </span>

      {/* Mono ordinal, so a set of six reads as a numbered menu. Top LEFT:
          the tick that appears on selection owns the opposite corner. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          padding: "4px 10px 5px",
          background: "var(--sb-ink)",
          color: "var(--sb-paper)",
          font: "var(--type-label)",
          fontSize: "max(0.75rem, 2.2cqi)",
          letterSpacing: "var(--tracking-label)",
        }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
    </>
  );
}

/**
 * One choosable scene, look or style.
 *
 * Selection is loud on purpose: the border goes heavy, the card lifts onto a
 * larger offset shadow, an inner paper rule doubles the frame, and a ring
 * snaps out of the tick once. On a booth with a queue behind it a guest gets
 * one glance to confirm the tap registered.
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
        boxShadow: selected ? "var(--shadow-slam-lg)" : "var(--shadow-slam-press)",
        transform: selected ? "translate(-4px, -4px)" : "none",
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
        <OptionFallback label={label} index={index} />
      )}

      {/* Inner rule: a second frame inset from the border, so a selected card
          reads as chosen from across the hall and not merely as thicker. */}
      {selected ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "max(7px, 1.5cqi)",
            border: "var(--border-hard) solid var(--sb-paper)",
            pointerEvents: "none",
          }}
        />
      ) : null}

      {/* Label slab, bottom-left, leaning with the brand. */}
      <span
        style={{
          position: "absolute",
          left: -4,
          bottom: "var(--space-4)",
          maxWidth: "94%",
          padding: "6px 18px 8px",
          background: selected ? "var(--sb-green)" : "var(--sb-ink)",
          color: selected ? "var(--sb-ink)" : "var(--sb-paper)",
          border: "var(--border-hard) solid var(--line-hard)",
          transform: "skewX(var(--skew-brand))",
          transition: "background var(--dur-snap) linear, color var(--dur-snap) linear",
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
            top: "max(10px, 2cqi)",
            right: "max(10px, 2cqi)",
            width: "max(40px, 8.3cqi)",
            height: "max(40px, 8.3cqi)",
            display: "grid",
            placeItems: "center",
            background: "var(--sb-green)",
            color: "var(--sb-ink)",
            border: "var(--border-hard) solid var(--line-hard)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 5cqi, 2.5rem)",
            lineHeight: 1,
          }}
        >
          {/* A hard ring that snaps out once and is gone — the tick's own
              confirmation, with no blur and nothing left spinning. */}
          <span
            style={{
              position: "absolute",
              inset: 0,
              border: "var(--border-hard) solid var(--sb-green)",
              animation: "sb-ring-pop var(--dur-slam) var(--ease-out-hard) both",
            }}
          />
          <span style={{ position: "relative" }}>&#10005;</span>
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
        // The bar is the only thing moving on the generating screen, so it is
        // sized as a slab rather than a hairline. `--booth-bar` is set on the
        // stage; the 22px is the token floor for anything rendered outside one.
        height: "var(--booth-bar, 22px)",
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
          // A guest holds a phone at arm's length: the code is a target first
          // and a graphic second, so it scales with the screen it is on.
          width: "max(132px, 27cqi)",
          height: "max(132px, 27cqi)",
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
            fontSize: "clamp(1.625rem, 5.4cqi, 3rem)",
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "var(--space-2) 0 0",
            font: "var(--type-body-sm)",
            fontSize: "max(0.9375rem, 2.9cqi)",
          }}
        >
          {body}
        </p>
        {shareUrl ? (
          <p
            style={{
              margin: "var(--space-3) 0 0",
              font: "var(--type-meta)",
              fontSize: "max(12px, 2.3cqi)",
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
