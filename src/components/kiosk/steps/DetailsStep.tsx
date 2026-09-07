"use client";

import { useState } from "react";
import { BigButton } from "@/components/kiosk/BigButton";
import { StepHeader } from "@/components/kiosk/StepChrome";
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
}: {
  preset: PublicPreset;
  values: Record<string, string>;
  consent: boolean;
  onChange: (key: string, value: string) => void;
  onConsentChange: (accepted: boolean) => void;
  onSubmit: () => void;
  busy: boolean;
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
    <div className="flex h-full flex-col">
      <StepHeader title="Let's get you set up" subtitle="So we can send you your portrait." />

      <div className="flex-1 space-y-5 overflow-y-auto px-7 pb-6">
        {fields.map((field) => {
          const error = showErrors ? errorFor(field.key, field.label, field.type, field.required) : null;
          return (
            <label key={field.id} className="block">
              <span className="mb-2 block text-sm font-medium uppercase tracking-wider text-ink-400">
                {field.label}
                {!field.required ? <span className="ml-2 normal-case text-ink-500">optional</span> : null}
              </span>
              <input
                type={field.type}
                value={values[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => onChange(field.key, event.target.value)}
                // Guests type on a public touchscreen; autocorrecting a name
                // or capitalising an email address is worse than not helping.
                autoComplete="off"
                autoCapitalize={field.type === "email" ? "none" : "words"}
                autoCorrect="off"
                spellCheck={false}
                inputMode={field.type === "email" ? "email" : field.type === "tel" ? "tel" : "text"}
                className={`w-full rounded-2xl bg-ink-850 px-5 py-4 text-lg text-ink-100
                  placeholder:text-ink-600 focus:outline-none focus:ring-2
                  ${error ? "ring-2 ring-danger" : "sb-hairline focus:ring-accent"}`}
              />
              {error ? <span className="mt-2 block text-sm text-danger">{error}</span> : null}
            </label>
          );
        })}

        <button
          type="button"
          onClick={() => onConsentChange(!consent)}
          aria-pressed={consent}
          className={`flex w-full gap-4 rounded-2xl p-4 text-left transition
            ${showErrors && !consent ? "ring-2 ring-danger" : "sb-hairline"}
            ${consent ? "bg-accent/10" : "bg-ink-850"}`}
        >
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition
              ${consent ? "bg-accent text-white" : "bg-ink-700 text-transparent"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-sm leading-relaxed text-ink-300">
            {preset.form.consent.text}
            {preset.form.consent.policyUrl ? (
              <span
                role="link"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setPolicyOpen(true);
                }}
                className="ml-1 underline decoration-accent underline-offset-4"
              >
                Read the full notice
              </span>
            ) : null}
          </span>
        </button>

        {showErrors && !consent ? (
          <p className="text-sm text-danger">Please accept the notice to continue.</p>
        ) : null}
      </div>

      <footer className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <BigButton onClick={submit} disabled={busy} className="w-full">
          {busy ? "Just a moment…" : "Continue"}
        </BigButton>
      </footer>

      {policyOpen && preset.form.consent.policyUrl ? (
        <div className="absolute inset-0 z-30 flex flex-col bg-ink-950/95 p-6">
          <iframe
            src={preset.form.consent.policyUrl}
            title="Privacy notice"
            className="flex-1 rounded-2xl bg-white"
          />
          <BigButton variant="secondary" onClick={() => setPolicyOpen(false)} className="mt-4 w-full">
            Close
          </BigButton>
        </div>
      ) : null}
    </div>
  );
}
