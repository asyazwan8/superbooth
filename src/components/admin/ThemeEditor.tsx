"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { OptionEditor } from "@/components/admin/OptionEditor";
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
import { newCustomisationId } from "@/lib/ids";
import {
  MAX_CUSTOMISATIONS,
  MAX_OPTIONS,
  type Customisation,
  type StepConfig,
  type Theme,
} from "@/lib/schema";
import {
  KNOWN_THEMES,
  buildTheme,
  composeCustomisations,
  composeThemePrompt,
  detectLook,
  type LookFamily,
} from "@/lib/theme/compose";

/**
 * The themes an event offers, and the questions each one asks.
 *
 * Themes nest, which is the whole point: a theme's customisations only make
 * sense inside it, so editing them anywhere else would invite an operator to
 * ask a jungle ranger which superpower they have. The nesting is why this is
 * its own component rather than three `OptionEditor`s in a row.
 */

const LOOKS: { value: LookFamily; label: string }[] = [
  { value: "photographic", label: "Photographic" },
  { value: "retro", label: "Retro film" },
  { value: "illustrated", label: "Illustrated" },
  { value: "comic", label: "Comic book" },
];

export function ThemeEditor({
  themes,
  config,
  onChange,
  onConfigChange,
}: {
  themes: Theme[];
  config: StepConfig;
  onChange: (themes: Theme[]) => void;
  onConfigChange: (config: StepConfig) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(themes[0]?.id ?? null);

  const update = (id: string, patch: Partial<Theme>) =>
    onChange(themes.map((theme) => (theme.id === id ? { ...theme, ...patch } : theme)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= themes.length) return;
    const next = [...themes];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
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
          <SectionTitle>Themes</SectionTitle>
          <p
            style={{
              margin: "var(--space-2) 0 0",
              font: "var(--type-body-sm)",
              color: "var(--text-invert-muted)",
            }}
          >
            The one thing a guest picks first. Each theme carries its whole look and up to{" "}
            {MAX_CUSTOMISATIONS} questions of its own.
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
          {themes.length} of {MAX_OPTIONS}
        </span>
      </header>

      <Card style={{ padding: "var(--space-4)" }}>
        <Field
          label="How the guest chooses"
          hint={
            config.mode === "fixed"
              ? "The booth skips the theme step and always uses your choice."
              : "The guest picks from the enabled themes below. With only one enabled, the step is skipped automatically."
          }
        >
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Select
              aria-label="How the guest chooses"
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
                aria-label="Fixed theme"
                value={config.fixedId ?? ""}
                onChange={(event) => onConfigChange({ ...config, fixedId: event.target.value })}
                style={{ flex: 1 }}
              >
                <option value="">First enabled theme</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.label}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </Field>
      </Card>

      <ThemeBuilder
        disabled={themes.length >= MAX_OPTIONS}
        onBuild={(theme) => {
          onChange([...themes, theme]);
          setExpanded(theme.id);
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {themes.map((theme, index) => {
          const open = expanded === theme.id;
          return (
            <Card key={theme.id} style={{ overflow: "hidden" }}>
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
                    disabled={index === themes.length - 1}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : theme.id)}
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
                    }}
                  >
                    {theme.label || "Untitled"}
                  </span>
                  <span
                    style={{
                      display: "block",
                      font: "var(--type-meta)",
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    {theme.customisations.length} customisation
                    {theme.customisations.length === 1 ? "" : "s"}
                  </span>
                </button>

                <Toggle
                  checked={theme.enabled}
                  onChange={(enabled) => update(theme.id, { enabled })}
                  label=""
                  srLabel={`Show "${theme.label || "Untitled"}" in the booth`}
                />

                <Button
                  tone="danger"
                  onClick={() => onChange(themes.filter((entry) => entry.id !== theme.id))}
                >
                  Remove
                </Button>
              </div>

              {open ? (
                <div
                  style={{
                    borderTop: "var(--border-hair) solid var(--line-soft)",
                    padding: "var(--space-4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-5)",
                  }}
                >
                  <div
                    className="sb-split"
                    style={{
                      display: "grid",
                      gap: "var(--space-4)",
                      gridTemplateColumns: "200px minmax(0, 1fr)",
                    }}
                  >
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}
                    >
                      <ImageUploadField
                        value={theme.imageUrl}
                        kind="reference"
                        onChange={(url) => update(theme.id, { imageUrl: url })}
                        emptyLabel="Card artwork"
                      />
                      {theme.imageUrl ? (
                        <Toggle
                          checked={theme.useAsReference}
                          onChange={(useAsReference) => update(theme.id, { useAsReference })}
                          label="Send to the model"
                        />
                      ) : null}
                    </div>

                    <div
                      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
                    >
                      <Field label="Theme name" hint="What the guest sees on the card.">
                        <Input
                          value={theme.label}
                          maxLength={40}
                          onChange={(event) => update(theme.id, { label: event.target.value })}
                        />
                      </Field>

                      <Field
                        label="Prompt"
                        hint="Render style, setting and wardrobe. Identity, full-body framing and the guards are added automatically — you do not need to repeat them here."
                      >
                        <Textarea
                          value={theme.prompt}
                          maxLength={1200}
                          onChange={(event) => update(theme.id, { prompt: event.target.value })}
                        />
                      </Field>

                      <RebuildControls
                        name={theme.label}
                        onPrompt={(prompt) => update(theme.id, { prompt })}
                        onCustomisations={(customisations) =>
                          update(theme.id, { customisations })
                        }
                      />
                    </div>
                  </div>

                  <CustomisationList
                    customisations={theme.customisations}
                    onChange={(customisations) => update(theme.id, { customisations })}
                  />
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The builder                                                         */
/* ------------------------------------------------------------------ */

/**
 * Type a theme name, get a working theme.
 *
 * The four shipped themes come out of this same function, so an operator can
 * verify it by typing "Cyberpunk" and seeing what the booth ships with. Names
 * it has no recipe for still get the full scaffold — the sections in the right
 * order with the name woven through — which is the part that is tedious to
 * remember and easy to get wrong.
 */
function ThemeBuilder({
  disabled,
  onBuild,
}: {
  disabled: boolean;
  onBuild: (theme: Theme) => void;
}) {
  const [name, setName] = useState("");
  const [look, setLook] = useState<LookFamily | "auto">("auto");

  const resolved = look === "auto" ? detectLook(name || "theme") : look;
  const ready = name.trim().length >= 2 && !disabled;

  return (
    <Card style={{ padding: "var(--space-4)" }}>
      <SectionTitle>Build a theme</SectionTitle>
      <p
        style={{
          margin: "var(--space-2) 0 var(--space-3)",
          font: "var(--type-body-sm)",
          color: "var(--text-muted)",
        }}
      >
        Name a theme and it is written for you — prompt, and a starter set of
        questions to ask the guest. Everything stays editable afterwards. Known
        names: {KNOWN_THEMES.join(", ")}.
      </p>

      <div
        className="sb-split"
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "minmax(0, 1fr) 180px auto",
          alignItems: "end",
        }}
      >
        {/* Not "Theme name": an expanded theme below has a field by that name,
            and two identical labels on one page is ambiguous to anyone
            navigating by label rather than by eye. */}
        <Field label="New theme name">
          <Input
            value={name}
            maxLength={40}
            placeholder="e.g. Deep Sea"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <Field label="Look" hint={look === "auto" ? `Detected: ${resolved}` : undefined}>
          <Select
            value={look}
            onChange={(event) => setLook(event.target.value as LookFamily | "auto")}
          >
            <option value="auto">Auto from name</option>
            {LOOKS.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </Select>
        </Field>

        <Button
          tone="primary"
          disabled={!ready}
          onClick={() => {
            onBuild(buildTheme(name.trim(), look === "auto" ? undefined : look));
            setName("");
            setLook("auto");
          }}
        >
          {disabled ? `Maximum of ${MAX_OPTIONS}` : "Build theme"}
        </Button>
      </div>
    </Card>
  );
}

/** Re-runs the builder against an existing theme, one half at a time. */
function RebuildControls({
  name,
  onPrompt,
  onCustomisations,
}: {
  name: string;
  onPrompt: (prompt: string) => void;
  onCustomisations: (customisations: Customisation[]) => void;
}) {
  const ready = name.trim().length >= 2;

  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <Button disabled={!ready} onClick={() => onPrompt(composeThemePrompt(name))}>
        Rebuild prompt from name
      </Button>
      {/* Separate buttons because they destroy different work: one overwrites
          a prompt, the other replaces every question and its options. */}
      <Button disabled={!ready} onClick={() => onCustomisations(composeCustomisations(name))}>
        Reset questions from name
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Customisations                                                      */
/* ------------------------------------------------------------------ */

function CustomisationList({
  customisations,
  onChange,
}: {
  customisations: Customisation[];
  onChange: (customisations: Customisation[]) => void;
}) {
  const update = (id: string, patch: Partial<Customisation>) =>
    onChange(customisations.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));

  const add = () => {
    if (customisations.length >= MAX_CUSTOMISATIONS) return;
    onChange([
      ...customisations,
      {
        id: newCustomisationId(),
        label: "Untitled",
        title: "",
        subtitle: "",
        options: [],
        enabled: true,
      },
    ]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "var(--space-3)",
        }}
      >
        <SectionTitle>Questions this theme asks</SectionTitle>
        <span
          style={{
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {customisations.length} of {MAX_CUSTOMISATIONS}
        </span>
      </div>

      {customisations.map((slot) => (
        <Card key={slot.id} style={{ padding: "var(--space-4)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-3)",
              marginBottom: "var(--space-3)",
            }}
          >
            <Toggle
              checked={slot.enabled}
              onChange={(enabled) => update(slot.id, { enabled })}
              label=""
              srLabel={`Ask "${slot.label || "Untitled"}"`}
            />
            <span style={{ flex: 1, font: "var(--type-body-sm)", color: "var(--text-muted)" }}>
              Fewer than two options and the booth resolves this silently instead
              of asking.
            </span>
            <Button
              tone="danger"
              onClick={() => onChange(customisations.filter((entry) => entry.id !== slot.id))}
            >
              Remove
            </Button>
          </div>

          <div
            className="sb-split"
            style={{
              display: "grid",
              gap: "var(--space-3)",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              marginBottom: "var(--space-4)",
            }}
          >
            <Field label="Label" hint="Names this in the prompt and in analytics.">
              <Input
                value={slot.label}
                maxLength={40}
                onChange={(event) => update(slot.id, { label: event.target.value })}
              />
            </Field>
            <Field label="Kiosk headline" hint="Defaults to the label.">
              <Input
                value={slot.title}
                maxLength={60}
                placeholder={slot.label}
                onChange={(event) => update(slot.id, { title: event.target.value })}
              />
            </Field>
            <Field label="Kiosk subtitle">
              <Input
                value={slot.subtitle}
                maxLength={120}
                onChange={(event) => update(slot.id, { subtitle: event.target.value })}
              />
            </Field>
          </div>

          <OptionEditor
            title="Options"
            description="What the guest can pick for this question."
            options={slot.options}
            onChange={(options) => update(slot.id, { options })}
            idPrefix="opt"
            defaultReference={false}
          />
        </Card>
      ))}

      <Button onClick={add} disabled={customisations.length >= MAX_CUSTOMISATIONS}>
        {customisations.length >= MAX_CUSTOMISATIONS
          ? `Maximum of ${MAX_CUSTOMISATIONS}`
          : "Add a question"}
      </Button>
    </div>
  );
}

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
      style={{
        width: 26,
        height: 20,
        display: "grid",
        placeItems: "center",
        background: "none",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.25 : 0.7,
        color: "inherit",
        fontSize: 10,
        padding: 0,
      }}
    >
      {glyph}
    </button>
  );
}
