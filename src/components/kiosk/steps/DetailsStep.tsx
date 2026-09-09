"use client";

import { useState } from "react";
import { StepHeader } from "@/components/ds/booth";
import { Button, ConsentCheck, TextField } from "@/components/ds/core";
import type { PublicPreset } from "@/lib/schema";

/**
 * Name, email and PDPA consent.
 *
 * This is the only screen where a guest types, and it is where most drop-off
 * happens, so it asks for as little as the operator configured and nothing
 * more. Validation is inline and only appears after a submit attempt —
 * scolding someone mid-keystroke on a public screen is a bad look.
 */
export function DetailsStep({
  preset,
  values,
  consent,
  onChange,
  onConsentChange,
  onSubmit,
  busy,
  stepNumber,
  stepTotal,
}: {
  preset: PublicPreset;
  values: Record<string, string>;
  consent: boolean;
  onChange: (key: string, value: string) => void;
  onConsentChange: (accepted: boolean) => void;
  onSubmit: () => void;
  busy: boolean;
  stepNumber: number;
  stepTotal: number;
}) {
  const [showErrors, setShowErrors] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);

  const fields = preset.form.fields.filter((field) => field.enabled);

  const errorFor = (key: string, label: string, type: string, required: boolean) => {
    const value = (values[key] ?? "").trim();
    if (required && !value) return `${label} is required`;
    if (type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return "That email address doesn't look right";
    }
    return null;
  };

  const errors = fields
    .map((field) => errorFor(field.key, field.label, field.type, field.required))
    .filter(Boolean);
  const valid = errors.length === 0 && consent;

  const submit = () => {
    setShowErrors(true);
    if (valid) onSubmit();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StepHeader
        eyebrow={`Step ${String(stepNumber).padStart(2, "0")} / ${String(stepTotal).padStart(2, "0")}`}
        title="Let's get you set up"
        subtitle="So we can send you your portrait."
        tone="ink"
      />

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "var(--booth-stack)",
          padding: "0 var(--booth-gutter) var(--space-6)",
        }}
      >
        {fields.map((field) => (
          <TextField
            key={field.id}
            label={field.label}
            optional={!field.required}
            type={field.type}
            value={values[field.key] ?? ""}
            placeholder={field.placeholder}
            onValueChange={(value) => onChange(field.key, value)}
            error={
              showErrors
                ? errorFor(field.key, field.label, field.type, field.required)
                : null
            }
            // Guests type on a public touchscreen; autocorrecting a name or
            // capitalising an email address is worse than not helping.
            autoComplete="off"
            autoCapitalize={field.type === "email" ? "none" : "words"}
            autoCorrect="off"
            spellCheck={false}
            inputMode={
              field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"
            }
          />
        ))}

        <ConsentCheck
          checked={consent}
          onChange={onConsentChange}
          error={showErrors && !consent}
        >
          {preset.form.consent.text}
          {preset.form.consent.policyUrl ? (
            <span
              role="link"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                setPolicyOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  event.preventDefault();
                  setPolicyOpen(true);
                }
              }}
              style={{
                marginLeft: 6,
                textDecoration: "underline",
                textDecorationColor: "var(--sb-pink)",
                textUnderlineOffset: 4,
                fontWeight: 700,
              }}
            >
              Read the full notice
            </span>
          ) : null}
        </ConsentCheck>

        {showErrors && !consent ? (
          <p
            style={{
              margin: 0,
              font: "var(--type-meta)",
              color: "var(--sb-paper)",
              background: "var(--sb-pink)",
              padding: "8px 12px",
              border: "var(--border-hair) solid var(--line-hard)",
            }}
          >
            Please accept the notice to continue.
          </p>
        ) : null}
      </div>

      <footer
        style={{
          flexShrink: 0,
          padding: "var(--space-4) var(--booth-gutter) var(--space-8)",
        }}
      >
        <Button full onClick={submit} disabled={busy}>
          {busy ? "Just a moment…" : "Continue"}
        </Button>
      </footer>

      {policyOpen && preset.form.consent.policyUrl ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--booth-gutter)",
            background: "var(--surface-scrim)",
          }}
        >
          <iframe
            src={preset.form.consent.policyUrl}
            title="Privacy notice"
            style={{
              flex: 1,
              background: "var(--sb-paper)",
              border: "var(--border-hard) solid var(--line-hard)",
            }}
          />
          <Button full tone="secondary" onClick={() => setPolicyOpen(false)}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}
