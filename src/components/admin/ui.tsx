"use client";

import type { CSSProperties } from "react";
import {
  Button as DsButton,
  EmptyState as DsEmptyState,
  Panel,
  Toggle as DsToggle,
  type PanelGround,
} from "@/components/ds/core";

/**
 * Admin primitives.
 *
 * The backend shares the booth's palette but not its scale: this is a desk
 * tool used with a mouse, so controls are 40px rather than 64px, dense, and
 * hover-aware — hover states exist here and nowhere else in the system.
 *
 * These are thin adapters over `components/ds`, kept because the admin's
 * inputs are uncontrolled-style (`onChange` with an event) while the booth's
 * are value-first. Wrapping is cheaper than rewriting every call site to a
 * signature the desk screens don't want.
 */

export function Button({
  tone = "secondary",
  ...props
}: React.ComponentProps<typeof DsButton>) {
  return <DsButton size="desk" lean={false} tone={tone} {...props} />;
}

export function Card({
  ground = "paper",
  children,
  ...props
}: React.ComponentProps<typeof Panel> & { ground?: PanelGround }) {
  return (
    <Panel ground={ground} shadow="press" {...props}>
      {children}
    </Panel>
  );
}

/**
 * A labelled control. This is a real `<label>` rather than the design system's
 * `Field` (which is a div, for content that is not an input): the backend's
 * fields are inputs, and the implicit association is what gives each one an
 * accessible name.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
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
    </label>
  );
}

/**
 * One control skin for input, textarea and select, so a row of mixed controls
 * lines up. Square, hard-bordered, on the panel ground.
 */
const CONTROL: CSSProperties = {
  width: "100%",
  minHeight: "var(--tap-min-desk)",
  padding: "8px var(--space-3)",
  background: "var(--surface-panel)",
  color: "var(--text-strong)",
  border: "var(--border-hard) solid var(--line-hard)",
  borderRadius: "var(--radius-sm)",
  font: "var(--type-body-sm)",
  fontFamily: "var(--font-ui)",
};

export function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...CONTROL, ...style }} />;
}

export function Textarea({
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...CONTROL, minHeight: 96, resize: "vertical", lineHeight: 1.5, ...style }}
    />
  );
}

export function Select({ style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...CONTROL, cursor: "pointer", ...style }} />;
}

export function Toggle(props: React.ComponentProps<typeof DsToggle>) {
  return <DsToggle {...props} />;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return <DsEmptyState title={title} body={body} />;
}

/**
 * A section heading. Display type on a gold rule, which is the one place the
 * backend borrows the booth's loudness — an operator scanning a long editor
 * needs the structure to be findable at a glance.
 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        paddingBottom: "var(--space-2)",
        borderBottom: "var(--border-hard) solid var(--sb-gold)",
        fontFamily: "var(--font-display)",
        fontSize: 20,
        lineHeight: 1,
        textTransform: "uppercase",
        // currentColor, not a fixed ink: this heading sits on a paper panel in
        // the editors and on the ink shell in the option lists.
        color: "currentColor",
      }}
    >
      {children}
    </h2>
  );
}

/**
 * The title block every backend screen opens with: display-cased heading, one
 * line of orientation, and an optional action pinned right.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "var(--space-4)",
        marginBottom: "var(--space-6)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            display: "inline-block",
            padding: "6px 18px 8px",
            background: "var(--sb-gold)",
            color: "var(--sb-ink)",
            border: "var(--border-hard) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam)",
            transform: "skewX(var(--skew-brand))",
            fontFamily: "var(--font-display)",
            fontSize: 30,
            lineHeight: 1,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
            {title}
          </span>
        </h1>
        {subtitle ? (
          <p
            style={{
              margin: "var(--space-4) 0 0",
              font: "var(--type-body-sm)",
              color: "var(--text-invert-muted)",
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div style={{ marginLeft: "auto" }}>{action}</div> : null}
    </header>
  );
}

/**
 * An operation that failed. Solid pink rather than tinted text — a failed
 * activation an operator scrolls past is the whole problem this prevents.
 */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      style={{
        margin: 0,
        padding: "10px 14px",
        background: "var(--sb-pink)",
        color: "var(--sb-paper)",
        border: "var(--border-hard) solid var(--line-hard)",
        font: "var(--type-body-sm)",
      }}
    >
      {children}
    </p>
  );
}
