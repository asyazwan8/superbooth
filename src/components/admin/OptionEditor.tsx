"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  Button,
  Card,
  Field,
  Input,
  SectionTitle,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { newOptionId } from "@/lib/ids";
import { MAX_OPTIONS, type BoothOption, type StepConfig } from "@/lib/schema";

/**
 * Editor for a list of booth options — a theme's own list, or the options
 * inside one of its customisations.
 *
 * Both share this component because they share a shape: a label, a prompt
 * fragment, and an optional reference image. The differences are copy and
 * whether backdrop generation is offered.
 *
 * The mode control lives here rather than in a separate "flow" tab because
 * "which of these does the guest choose from, or do I pick one for them" is
 * the same decision as editing the list itself. A customisation has no such
 * control — a slot with one option resolves silently rather than costing a tap
 * — so `config` is optional.
 */
export function OptionEditor({
  title,
  description,
  options,
  config,
  onChange,
  onConfigChange,
  idPrefix,
  allowGenerate = false,
  defaultReference = true,
  configLabel = "How the guest chooses",
}: {
  title: string;
  description: string;
  options: BoothOption[];
  config?: StepConfig;
  onChange: (options: BoothOption[]) => void;
  onConfigChange?: (config: StepConfig) => void;
  idPrefix: string;
  allowGenerate?: boolean;
  /** Whether a new option's image, once uploaded, is sent to the model. */
  defaultReference?: boolean;
  /**
   * Names the fixed-vs-select control. More than one list can share a tab, and
   * two identically labelled controls on one page is ambiguous to anyone
   * navigating by label rather than by eye.
   */
  configLabel?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(options[0]?.id ?? null);

  const update = (id: string, patch: Partial<BoothOption>) =>
    onChange(options.map((option) => (option.id === id ? { ...option, ...patch } : option)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const add = () => {
    if (options.length >= MAX_OPTIONS) return;
    const option: BoothOption = {
      id: newOptionId(idPrefix),
      label: "Untitled",
      prompt: "",
      imageUrl: null,
      useAsReference: defaultReference,
      enabled: true,
    };
    onChange([...options, option]);
    setExpanded(option.id);
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <div>
          <SectionTitle>{title}</SectionTitle>
          <p
            style={{
              margin: "var(--space-2) 0 0",
              font: "var(--type-body-sm)",
              color: "var(--text-invert-muted)",
            }}
          >
            {description}
          </p>
        </div>
        <span
          style={{
            flexShrink: 0,
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            color: "var(--text-invert-muted)",
          }}
        >
          {options.length} of {MAX_OPTIONS}
        </span>
      </header>

      {config && onConfigChange ? (
      <Card style={{ padding: "var(--space-4)" }}>
        <Field
          label={configLabel}
          hint={
            config.mode === "fixed"
              ? "The booth skips this step entirely and always uses your choice."
              : "The guest picks from the enabled options below. With only one enabled, the step is skipped automatically."
          }
        >
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Select
              aria-label={configLabel}
              value={config.mode}
              onChange={(event) =>
                onConfigChange({ ...config, mode: event.target.value as StepConfig["mode"] })
              }
              style={{ flex: 1 }}
            >
              <option value="select">Guest selects</option>
              <option value="fixed">Fixed by me</option>
            </Select>

            {config.mode === "fixed" ? (
              <Select
                aria-label="Fixed option"
                value={config.fixedId ?? ""}
                onChange={(event) => onConfigChange({ ...config, fixedId: event.target.value })}
                style={{ flex: 1 }}
              >
                <option value="">First enabled option</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </Field>
      </Card>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {options.map((option, index) => {
          const open = expanded === option.id;
          return (
            <Card key={option.id} style={{ overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-3)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <ReorderButton
                    label="Move up"
                    glyph="▲"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  />
                  <ReorderButton
                    label="Move down"
                    glyph="▼"
                    onClick={() => move(index, 1)}
                    disabled={index === options.length - 1}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : option.id)}
                  style={{
                    minWidth: 0,
                    flex: 1,
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      lineHeight: 1.1,
                      textTransform: "uppercase",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label || "Untitled"}
                  </span>
                  <span
                    style={{
                      display: "block",
                      font: "var(--type-meta)",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.prompt || "No prompt yet"}
                  </span>
                </button>

                <Toggle
                  checked={option.enabled}
                  onChange={(enabled) => update(option.id, { enabled })}
                  label=""
                  srLabel={`Show "${option.label || "Untitled"}" in the booth`}
                />

                <Button
                  tone="danger"
                  onClick={() => onChange(options.filter((entry) => entry.id !== option.id))}
                >
                  Remove
                </Button>
              </div>

              {open ? (
                <div
                  className="sb-split"
                  style={{
                    display: "grid",
                    gap: "var(--space-4)",
                    gridTemplateColumns: "200px minmax(0, 1fr)",
                    borderTop: "var(--border-hair) solid var(--line-soft)",
                    padding: "var(--space-4)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <ImageUploadField
                      value={option.imageUrl}
                      kind="reference"
                      onChange={(url) => update(option.id, { imageUrl: url })}
                      emptyLabel="Reference image"
                    />
                    {allowGenerate ? (
                      <GenerateSceneButton
                        description={option.prompt || option.label}
                        onGenerated={(url) => update(option.id, { imageUrl: url })}
                      />
                    ) : null}
                    {option.imageUrl ? (
                      <Toggle
                        checked={option.useAsReference}
                        onChange={(useAsReference) => update(option.id, { useAsReference })}
                        label="Send to the model"
                      />
                    ) : null}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <Field label="Label" hint="What the guest sees on the button.">
                      <Input
                        value={option.label}
                        maxLength={40}
                        onChange={(event) => update(option.id, { label: event.target.value })}
                      />
                    </Field>
                    <Field
                      label="Prompt fragment"
                      hint="Describe the look in plain language. This is added to the generation prompt when the guest picks this option."
                    >
                      <Textarea
                        value={option.prompt}
                        maxLength={1200}
                        onChange={(event) => update(option.id, { prompt: event.target.value })}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Button onClick={add} disabled={options.length >= MAX_OPTIONS}>
        {options.length >= MAX_OPTIONS ? `Maximum of ${MAX_OPTIONS}` : "Add option"}
      </Button>
    </section>
  );
}

/** Generates a backdrop from the option's own prompt text. */
function GenerateSceneButton({
  description,
  onGenerated,
}: {
  description: string;
  onGenerated: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/generate-scene", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Generation failed.");
      onGenerated(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Button onClick={generate} disabled={busy || description.trim().length < 3} full>
        {busy ? "Generating…" : "Generate from prompt"}
      </Button>
      {error ? (
        <p style={{ margin: 0, font: "var(--type-meta)", fontSize: 12, color: "var(--state-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The up/down pair on an option row. Small, square, unlabelled by design. */
function ReorderButton({
  label,
  glyph,
  onClick,
  disabled,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="sb-hover"
      style={{
        padding: "0 6px",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        color: "var(--text-strong)",
        opacity: disabled ? 0.25 : 0.7,
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      {glyph}
    </button>
  );
}
