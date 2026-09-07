"use client";

import { useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { Button, Card, Field, Input, Select, Textarea, Toggle } from "@/components/admin/ui";
import { newOptionId } from "@/lib/ids";
import { MAX_OPTIONS, type BoothOption, type StepConfig } from "@/lib/schema";

/**
 * Editor for one family of booth options — scenes, looks, or styles.
 *
 * All three share this component because they share a shape: a label, a prompt
 * fragment, and an optional reference image. The differences are copy and
 * whether AI scene generation is offered.
 *
 * The mode control lives here rather than in a separate "flow" tab because
 * "which of these does the guest choose from, or do I pick one for them" is
 * the same decision as editing the list itself.
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
}: {
  title: string;
  description: string;
  options: BoothOption[];
  config: StepConfig;
  onChange: (options: BoothOption[]) => void;
  onConfigChange: (config: StepConfig) => void;
  idPrefix: string;
  allowGenerate?: boolean;
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
      useAsReference: true,
      enabled: true,
    };
    onChange([...options, option]);
    setExpanded(option.id);
  };

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-100">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-400">{description}</p>
        </div>
        <span className="shrink-0 text-xs text-ink-500">
          {options.length} of {MAX_OPTIONS}
        </span>
      </header>

      <Card className="space-y-3 p-4">
        <Field
          label="How the guest chooses"
          hint={
            config.mode === "fixed"
              ? "The booth skips this step entirely and always uses your choice."
              : "The guest picks from the enabled options below. With only one enabled, the step is skipped automatically."
          }
        >
          <div className="flex gap-2">
            <Select
              value={config.mode}
              onChange={(event) =>
                onConfigChange({ ...config, mode: event.target.value as StepConfig["mode"] })
              }
              className="flex-1"
            >
              <option value="select">Guest selects</option>
              <option value="fixed">Fixed by me</option>
            </Select>

            {config.mode === "fixed" ? (
              <Select
                value={config.fixedId ?? ""}
                onChange={(event) => onConfigChange({ ...config, fixedId: event.target.value })}
                className="flex-1"
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

      <div className="space-y-2">
        {options.map((option, index) => {
          const open = expanded === option.id;
          return (
            <Card key={option.id} className="overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="px-1 text-xs text-ink-500 hover:text-ink-100 disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => move(index, 1)}
                    disabled={index === options.length - 1}
                    className="px-1 text-xs text-ink-500 hover:text-ink-100 disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : option.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium text-ink-100">
                    {option.label || "Untitled"}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {option.prompt || "No prompt yet"}
                  </span>
                </button>

                <Toggle
                  checked={option.enabled}
                  onChange={(enabled) => update(option.id, { enabled })}
                  label=""
                />

                <Button
                  tone="danger"
                  onClick={() => onChange(options.filter((entry) => entry.id !== option.id))}
                >
                  Remove
                </Button>
              </div>

              {open ? (
                <div className="grid gap-4 border-t border-ink-800 p-4 sm:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
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

                  <div className="space-y-3">
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
    <div className="space-y-1">
      <Button
        onClick={generate}
        disabled={busy || description.trim().length < 3}
        className="w-full"
      >
        {busy ? "Generating…" : "Generate from prompt"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
