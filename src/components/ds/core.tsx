"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/**
 * Core primitives, ported from the Superbooth design system.
 *
 * Everything is styled inline against the CSS custom properties in
 * src/styles/tokens — that is the design system's own idiom, and it keeps a
 * component's brand decisions readable in one place instead of split between a
 * class name and a stylesheet.
 *
 * The house rules these encode: square corners, a 3px ink border on
 * everything, depth as a hard zero-blur offset shadow that collapses on press,
 * and one shared -7deg lean taken off the Super! logo.
 */

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export type ButtonTone =
  | "primary"
  | "secondary"
  | "invert"
  | "quiet"
  | "ghost"
  | "danger";

const BUTTON_TONES: Record<ButtonTone, CSSProperties> = {
  primary: { background: "var(--sb-pink)", color: "var(--sb-paper)" },
  secondary: { background: "var(--sb-gold)", color: "var(--sb-ink)" },
  invert: { background: "var(--sb-purple)", color: "var(--sb-green)" },
  quiet: { background: "var(--sb-paper)", color: "var(--sb-ink)" },
  ghost: { background: "transparent", color: "var(--sb-paper)" },
  danger: { background: "var(--sb-ink)", color: "var(--sb-pink)" },
};

const BUTTON_SIZES = {
  booth: { minHeight: "var(--tap-min)", padding: "0 32px", fontSize: "1.125rem" },
  desk: { minHeight: "var(--tap-min-desk)", padding: "0 16px", fontSize: "0.875rem" },
} satisfies Record<string, CSSProperties>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  tone?: ButtonTone;
  size?: keyof typeof BUTTON_SIZES;
  full?: boolean;
  lean?: boolean;
  type?: "button" | "submit";
}

/**
 * The house button: a skewed slab whose shadow collapses and body translates
 * on press, so the block physically sits down. Touch-first — the booth has no
 * hover, so the pressed state does all the feedback work.
 */
export function Button({
  tone = "primary",
  size = "booth",
  full = false,
  lean = true,
  type = "button",
  disabled = false,
  className = "",
  children,
  style,
  ...rest
}: ButtonProps) {
  const [down, setDown] = useState(false);
  const pressed = down && !disabled;

  return (
    <button
      type={type}
      disabled={disabled}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      className={`sb-hover ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        width: full ? "100%" : undefined,
        border:
          tone === "ghost"
            ? "var(--border-hard) solid currentColor"
            : "var(--border-hard) solid var(--line-hard)",
        borderRadius: "var(--radius-0)",
        font: "var(--type-button)",
        letterSpacing: "var(--tracking-button)",
        textTransform: "uppercase",
        fontFamily: "var(--font-ui)",
        cursor: disabled ? "default" : "pointer",
        transform: `${lean ? "skewX(var(--skew-brand))" : ""} ${
          pressed ? "translate(4px, 4px)" : "translate(0, 0)"
        }`,
        boxShadow:
          tone === "ghost"
            ? "none"
            : pressed
              ? "var(--shadow-slam-press)"
              : "var(--shadow-slam)",
        transition:
          "transform var(--dur-instant) var(--ease-snap), box-shadow var(--dur-instant) linear, filter var(--dur-instant) linear",
        opacity: disabled ? 0.4 : 1,
        // Disabled is never just faded — grayscale removes it from the palette
        // so a dimmed pink slab cannot be mistaken for an active one.
        filter: disabled ? "grayscale(1)" : undefined,
        ...BUTTON_TONES[tone],
        ...BUTTON_SIZES[size],
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          transform: lean ? "skewX(var(--skew-brand-counter))" : undefined,
        }}
      >
        {children}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export type PanelGround = "paper" | "sunk" | "gold" | "purple" | "ink";
export type PanelShadow = "none" | "slam" | "large" | "accent" | "press";
export type PanelTexture = "none" | "halftone" | "check" | "stripe";

const PANEL_GROUNDS: Record<PanelGround, CSSProperties> = {
  paper: { background: "var(--surface-panel)", color: "var(--text-strong)" },
  sunk: { background: "var(--surface-panel-sunk)", color: "var(--text-strong)" },
  gold: { background: "var(--surface-menu)", color: "var(--text-strong)" },
  purple: { background: "var(--surface-invert)", color: "var(--text-invert)" },
  ink: { background: "var(--sb-ink-2)", color: "var(--text-invert)" },
};

const PANEL_SHADOWS: Record<PanelShadow, string> = {
  none: "none",
  slam: "var(--shadow-slam)",
  large: "var(--shadow-slam-lg)",
  accent: "var(--shadow-slam-pink)",
  press: "var(--shadow-slam-press)",
};

const PANEL_TEXTURES: Record<PanelTexture, CSSProperties | undefined> = {
  none: undefined,
  halftone: {
    backgroundImage: "var(--texture-halftone)",
    backgroundSize: "var(--texture-halftone-size)",
  },
  check: {
    backgroundImage: "var(--texture-check)",
    backgroundSize: "var(--texture-check-size)",
  },
  stripe: { backgroundImage: "var(--texture-stripe)" },
};

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  ground?: PanelGround;
  shadow?: PanelShadow;
  texture?: PanelTexture;
  lean?: boolean;
}

/**
 * The universal container. There is no soft-shadow card in this system —
 * depth is a solid offset block, which is why every panel reads as a physical
 * slab rather than a floating surface.
 */
export function Panel({
  ground = "paper",
  shadow = "slam",
  texture = "none",
  lean = false,
  children,
  style,
  ...rest
}: PanelProps) {
  return (
    <div
      style={{
        border: "var(--border-hard) solid var(--line-hard)",
        borderRadius: "var(--radius-0)",
        boxShadow: PANEL_SHADOWS[shadow],
        transform: lean ? "skewX(var(--skew-brand))" : undefined,
        ...PANEL_GROUNDS[ground],
        ...PANEL_TEXTURES[texture],
        ...style,
      }}
      {...rest}
    >
      {lean ? (
        <div style={{ transform: "skewX(var(--skew-brand-counter))" }}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type BadgeTone = "accent" | "positive" | "warn" | "neutral" | "invert";

const BADGE_TONES: Record<BadgeTone, CSSProperties> = {
  accent: { background: "var(--sb-pink)", color: "var(--sb-paper)" },
  positive: { background: "var(--sb-green)", color: "var(--sb-ink)" },
  warn: { background: "var(--sb-gold)", color: "var(--sb-ink)" },
  neutral: { background: "var(--sb-paper)", color: "var(--sb-ink)" },
  invert: { background: "var(--sb-purple)", color: "var(--sb-green)" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  lean?: boolean;
}

/** A small skewed tag for status, step counts and mode flags. */
export function Badge({
  tone = "accent",
  lean = true,
  children,
  style,
  ...rest
}: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        border: "var(--border-hair) solid var(--line-hard)",
        padding: "5px 12px",
        font: "var(--type-label)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        transform: lean ? "skewX(var(--skew-brand))" : undefined,
        whiteSpace: "nowrap",
        ...BADGE_TONES[tone],
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          display: "inline-block",
          transform: lean ? "skewX(var(--skew-brand-counter))" : undefined,
        }}
      >
        {children}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* TextField                                                           */
/* ------------------------------------------------------------------ */

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  error?: string | null;
  size?: "booth" | "desk";
  optional?: boolean;
}

/**
 * The only screen where a guest types is the details step, so the booth size
 * is oversized: a mono label above, a paper input with a hard border, and an
 * error that appears only after a submit attempt.
 */
export function TextField({
  label,
  value,
  onValueChange,
  error = null,
  size = "booth",
  optional = false,
  style,
  ...rest
}: TextFieldProps) {
  const [focus, setFocus] = useState(false);
  const booth = size === "booth";

  return (
    <label style={{ display: "block", ...style }}>
      <span
        style={{
          display: "block",
          marginBottom: "var(--space-2)",
          font: "var(--type-label)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          color: "inherit",
        }}
      >
        {label}
        {optional ? (
          <span style={{ marginLeft: 8, opacity: 0.6 }}>optional</span>
        ) : null}
      </span>
      <input
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        // Guests type on a public touchscreen; autocorrecting a name or
        // capitalising an email address is worse than not helping.
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          width: "100%",
          minHeight: booth ? "var(--tap-min)" : "var(--tap-min-desk)",
          padding: booth ? "0 var(--space-5)" : "0 var(--space-3)",
          background: "var(--surface-panel)",
          color: "var(--text-strong)",
          border: `var(--border-hard) solid ${
            error ? "var(--state-danger)" : "var(--line-hard)"
          }`,
          borderRadius: "var(--radius-sm)",
          font: booth ? "var(--type-lead)" : "var(--type-body-sm)",
          fontFamily: "var(--font-ui)",
          boxShadow: focus ? "var(--shadow-slam-press)" : "none",
          outline: focus ? "var(--border-hard) solid var(--focus-ring)" : "none",
          outlineOffset: 2,
        }}
        {...rest}
      />
      {error ? (
        <span
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            font: "var(--type-meta)",
            color: "var(--state-danger)",
          }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
}

/** Operator-side multi-line input, for prompt fragments and consent wording. */
export function TextArea({
  label,
  value,
  onValueChange,
  hint,
  style,
  ...rest
}: TextAreaProps) {
  return (
    <label style={{ display: "block", ...style }}>
      {label ? (
        <span
          style={{
            display: "block",
            marginBottom: "var(--space-2)",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      ) : null}
      <textarea
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        style={{
          width: "100%",
          minHeight: 96,
          resize: "vertical",
          padding: "var(--space-3)",
          background: "var(--surface-panel)",
          color: "var(--text-strong)",
          border: "var(--border-hard) solid var(--line-hard)",
          borderRadius: "var(--radius-sm)",
          font: "var(--type-body-sm)",
          fontFamily: "var(--font-ui)",
          lineHeight: 1.5,
        }}
        {...rest}
      />
      {hint ? (
        <span
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            font: "var(--type-meta)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* ConsentCheck                                                        */
/* ------------------------------------------------------------------ */

export interface ConsentCheckProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
  children: ReactNode;
}

/**
 * The PDPA consent tick. The whole block is the target, not just the box — a
 * 28px checkbox is not a touch target on a 55" screen.
 */
export function ConsentCheck({
  checked,
  onChange,
  error = false,
  children,
}: ConsentCheckProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        gap: "var(--space-4)",
        width: "100%",
        textAlign: "left",
        padding: "var(--space-4)",
        background: checked ? "var(--sb-green)" : "var(--surface-panel)",
        color: "var(--text-strong)",
        border: `var(--border-hard) solid ${
          error ? "var(--state-danger)" : "var(--line-hard)"
        }`,
        borderRadius: "var(--radius-0)",
        boxShadow: "var(--shadow-slam-press)",
        cursor: "pointer",
        transition: "background var(--dur-snap) linear",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          background: checked ? "var(--sb-ink)" : "var(--surface-panel-sunk)",
          color: checked ? "var(--sb-green)" : "transparent",
          border: "var(--border-hard) solid var(--line-hard)",
          fontFamily: "var(--font-display)",
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        &#10005;
      </span>
      <span style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>
        {children}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */

export interface ToggleProps {
  /** Accessible name when `label` is empty — a bare switch has none otherwise. */
  srLabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
}

/** Operator-side switch. Square knob, hard border — no pill, no soft shadow. */
export function Toggle({ checked, onChange, label, srLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : srLabel}
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "var(--type-body-sm)",
        color: "inherit",
        textAlign: "left",
      }}
    >
      <span
        style={{
          position: "relative",
          width: 56,
          height: 30,
          flexShrink: 0,
          background: checked ? "var(--sb-green)" : "var(--surface-panel-sunk)",
          border: "var(--border-hard) solid var(--line-hard)",
          transition: "background var(--dur-snap) linear",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            left: checked ? 26 : 0,
            width: 24,
            height: 24,
            background: "var(--sb-ink)",
            transition: "left var(--dur-snap) var(--ease-snap)",
          }}
        />
      </span>
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}

/** Native select in house clothing. Backend only. */
export function Select({
  label,
  value,
  onValueChange,
  options,
  hint,
  style,
  ...rest
}: SelectProps) {
  return (
    <label style={{ display: "block", ...style }}>
      {label ? (
        <span
          style={{
            display: "block",
            marginBottom: "var(--space-2)",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        style={{
          width: "100%",
          minHeight: "var(--tap-min-desk)",
          padding: "0 var(--space-3)",
          background: "var(--surface-panel)",
          color: "var(--text-strong)",
          border: "var(--border-hard) solid var(--line-hard)",
          borderRadius: "var(--radius-sm)",
          font: "var(--type-body-sm)",
          fontFamily: "var(--font-ui)",
          cursor: "pointer",
        }}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            font: "var(--type-meta)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */

/** A mono label over arbitrary content, for controls that are not inputs. */
export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: "block", ...style }}>
      <span
        style={{
          display: "block",
          marginBottom: "var(--space-2)",
          font: "var(--type-label)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span
          style={{
            display: "block",
            marginTop: "var(--space-2)",
            font: "var(--type-meta)",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */

/** Nothing-here state. Dashed ink border, display-cased title, one plain line. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        border: "var(--border-hard) dashed var(--line-hard)",
        padding: "var(--space-12) var(--space-6)",
        textAlign: "center",
        background: "var(--surface-panel-sunk)",
        color: "var(--text-strong)",
      }}
    >
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
      {body ? (
        <p
          style={{
            margin: "var(--space-3) auto 0",
            maxWidth: 380,
            font: "var(--type-body-sm)",
            color: "var(--text-muted)",
          }}
        >
          {body}
        </p>
      ) : null}
      {action ? <div style={{ marginTop: "var(--space-6)" }}>{action}</div> : null}
    </div>
  );
}
