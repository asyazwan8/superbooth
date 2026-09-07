"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { KioskPreview } from "@/components/admin/KioskPreview";
import { OptionEditor } from "@/components/admin/OptionEditor";
import { TestGenerate } from "@/components/admin/TestGenerate";
import { Button, Card, Field, Input, Select, Textarea, Toggle } from "@/components/admin/ui";
import { estimateCostUsd } from "@/lib/fal/prompt";
import { newOptionId } from "@/lib/ids";
import type { FormField, Preset, PublicPreset } from "@/lib/schema";

/**
 * The preset editor.
 *
 * State is one `Preset` object edited in place and saved whole. Field-by-field
 * autosave sounds nicer but is wrong here: a half-saved preset is a booth
 * mid-event with three of six scenes, so changes stay local until the operator
 * commits them, and the unsaved-changes state is always visible.
 */

const TABS = ["Branding", "Guest form", "Scenes", "Looks", "Styles", "Generation"] as const;
type Tab = (typeof TABS)[number];

export function PresetEditor({ initial }: { initial: Preset }) {
  const router = useRouter();
  const [preset, setPreset] = useState<Preset>(initial);
  const [tab, setTab] = useState<Tab>("Branding");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(preset) !== JSON.stringify(initial),
    [preset, initial],
  );

  const patch = useCallback(
    (changes: Partial<Preset>) => setPreset((current) => ({ ...current, ...changes })),
    [],
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/presets/${preset.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(preset),
      });
      const data = (await response.json().catch(() => ({}))) as {
        preset?: Preset;
        error?: string;
      };
      if (!response.ok || !data.preset) throw new Error(data.error ?? "Could not save.");

      setPreset(data.preset);
      setSavedAt(Date.now());
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  // The preview needs the kiosk's view of the preset; enabled-only filtering
  // mirrors what sanitisePreset does on the server.
  const previewPreset: PublicPreset = {
    ...preset,
    scenes: preset.scenes.filter((option) => option.enabled),
    poses: preset.poses.filter((option) => option.enabled),
    treatments: preset.treatments.filter((option) => option.enabled),
    form: { ...preset.form, fields: preset.form.fields.filter((field) => field.enabled) },
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Input
            value={preset.name}
            onChange={(event) => patch({ name: event.target.value })}
            className="!border-transparent !bg-transparent !px-0 font-display !text-2xl font-semibold"
            aria-label="Event name"
          />
          <p className="mt-0.5 text-xs text-ink-500">
            {preset.isActive ? "This event is live on the booth." : "Draft — not live."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="text-xs text-warn">Unsaved changes</span>
          ) : savedAt ? (
            <span className="text-xs text-positive">Saved</span>
          ) : null}
          <Button tone="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <nav className="flex flex-wrap gap-1 border-b border-ink-800">
        {TABS.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTab(entry)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              tab === entry
                ? "border-accent text-ink-100"
                : "border-transparent text-ink-400 hover:text-ink-200"
            }`}
          >
            {entry}
          </button>
        ))}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          {tab === "Branding" ? <BrandingTab preset={preset} patch={patch} /> : null}
          {tab === "Guest form" ? <FormTab preset={preset} patch={patch} /> : null}

          {tab === "Scenes" ? (
            <OptionEditor
              title="Scenes"
              description="The background the portrait is set in."
              idPrefix="scene"
              allowGenerate
              options={preset.scenes}
              config={preset.flow.scene}
              onChange={(scenes) => patch({ scenes })}
              onConfigChange={(scene) => patch({ flow: { ...preset.flow, scene } })}
            />
          ) : null}

          {tab === "Looks" ? (
            <OptionEditor
              title="Looks"
              description="Costume and pose. Upload a reference photo, or describe it in the prompt."
              idPrefix="pose"
              options={preset.poses}
              config={preset.flow.pose}
              onChange={(poses) => patch({ poses })}
              onConfigChange={(pose) => patch({ flow: { ...preset.flow, pose } })}
            />
          ) : null}

          {tab === "Styles" ? (
            <OptionEditor
              title="Styles"
              description="How the portrait is rendered — 2D, 3D, abstract, and so on."
              idPrefix="treatment"
              options={preset.treatments}
              config={preset.flow.treatment}
              onChange={(treatments) => patch({ treatments })}
              onConfigChange={(treatment) => patch({ flow: { ...preset.flow, treatment } })}
            />
          ) : null}

          {tab === "Generation" ? <GenerationTab preset={preset} patch={patch} /> : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <KioskPreview preset={previewPreset} />
          <TestGenerate preset={preset} dirty={dirty} />
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BrandingTab({
  preset,
  patch,
}: {
  preset: Preset;
  patch: (changes: Partial<Preset>) => void;
}) {
  const branding = preset.branding;
  const set = (changes: Partial<Preset["branding"]>) =>
    patch({ branding: { ...branding, ...changes } });

  return (
    <div className="space-y-6">
      {/* items-start so the short masthead card does not stretch to match the
          tall 9:16 overlay preview beside it. */}
      <div className="grid items-start gap-6 sm:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-ink-100">Masthead</h3>
          <p className="text-xs text-ink-500">
            Shown on the idle screen. Leave empty to use the Superbooth wordmark.
          </p>
          <ImageUploadField
            value={branding.logoUrl}
            kind="logo"
            frameClassName="aspect-[3/2] w-full"
            emptyLabel="Logo (PNG with transparency)"
            onChange={(logoUrl) => set({ logoUrl })}
          />
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-ink-100">Photo overlay</h3>
          <p className="text-xs text-ink-500">
            A transparent 1080×1920 PNG composited onto every finished photo.
          </p>
          <ImageUploadField
            value={branding.overlayUrl}
            kind="overlay"
            frameClassName="aspect-[9/16] h-72"
            emptyLabel="Overlay (1080×1920 PNG)"
            onChange={(overlayUrl) => set({ overlayUrl, overlayEnabled: Boolean(overlayUrl) })}
          />
          <Toggle
            checked={branding.overlayEnabled}
            onChange={(overlayEnabled) => set({ overlayEnabled })}
            label="Apply overlay to photos"
          />
        </Card>
      </div>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Accent colour" hint="Drives every button and highlight in the booth.">
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.accent}
              onChange={(event) => set({ accent: event.target.value })}
              className="h-9 w-12 rounded-lg border border-ink-700 bg-ink-850"
              aria-label="Accent colour"
            />
            <Input value={branding.accent} onChange={(event) => set({ accent: event.target.value })} />
          </div>
        </Field>

        <Field label="Secondary accent" hint="Used for softer highlights and glows.">
          <div className="flex gap-2">
            <input
              type="color"
              value={branding.accentSoft}
              onChange={(event) => set({ accentSoft: event.target.value })}
              className="h-9 w-12 rounded-lg border border-ink-700 bg-ink-850"
              aria-label="Secondary accent colour"
            />
            <Input
              value={branding.accentSoft}
              onChange={(event) => set({ accentSoft: event.target.value })}
            />
          </div>
        </Field>

        <Field label="Idle headline">
          <Input
            value={branding.attractHeadline}
            maxLength={60}
            onChange={(event) => set({ attractHeadline: event.target.value })}
          />
        </Field>

        <Field label="Idle prompt">
          <Input
            value={branding.attractSubline}
            maxLength={120}
            onChange={(event) => set({ attractSubline: event.target.value })}
          />
        </Field>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function FormTab({
  preset,
  patch,
}: {
  preset: Preset;
  patch: (changes: Partial<Preset>) => void;
}) {
  const form = preset.form;
  const setFields = (fields: FormField[]) => patch({ form: { ...form, fields } });

  const update = (id: string, changes: Partial<FormField>) =>
    setFields(form.fields.map((field) => (field.id === id ? { ...field, ...changes } : field)));

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-100">What you collect</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            Every field is one more thing between a guest and their photo. Two is usually right.
          </p>
        </div>

        {form.fields.map((field) => (
          <Card key={field.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
            <Field label="Label">
              <Input
                value={field.label}
                maxLength={40}
                onChange={(event) => update(field.id, { label: event.target.value })}
              />
            </Field>
            <Field label="Placeholder">
              <Input
                value={field.placeholder}
                maxLength={60}
                onChange={(event) => update(field.id, { placeholder: event.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select
                value={field.type}
                onChange={(event) =>
                  update(field.id, { type: event.target.value as FormField["type"] })
                }
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="tel">Phone</option>
              </Select>
            </Field>
            <div className="flex items-end gap-3 pb-1">
              <Toggle
                checked={field.required}
                onChange={(required) => update(field.id, { required })}
                label="Required"
              />
              <Button
                tone="danger"
                onClick={() => setFields(form.fields.filter((entry) => entry.id !== field.id))}
              >
                Remove
              </Button>
            </div>
          </Card>
        ))}

        <Button
          disabled={form.fields.length >= 8}
          onClick={() => {
            const index = form.fields.length + 1;
            setFields([
              ...form.fields,
              {
                id: newOptionId("field"),
                key: `field${index}`,
                label: "New field",
                placeholder: "",
                type: "text",
                required: false,
                enabled: true,
              },
            ]);
          }}
        >
          Add field
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-100">Consent</h2>
          <p className="mt-0.5 text-sm text-ink-400">
            The exact wording shown is stored with every session. Bump the version whenever you
            change it, so older records stay tied to the text those guests actually agreed to.
          </p>
        </div>

        <Card className="space-y-4 p-4">
          <Field label="Consent text">
            <Textarea
              value={form.consent.text}
              maxLength={2000}
              className="min-h-32"
              onChange={(event) =>
                patch({ form: { ...form, consent: { ...form.consent, text: event.target.value } } })
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Version">
              <Input
                value={form.consent.version}
                maxLength={20}
                onChange={(event) =>
                  patch({
                    form: { ...form, consent: { ...form.consent, version: event.target.value } },
                  })
                }
              />
            </Field>
            <Field label="Full privacy notice URL" hint="Optional. Opens in the booth on request.">
              <Input
                value={form.consent.policyUrl ?? ""}
                placeholder="https://…"
                onChange={(event) =>
                  patch({
                    form: {
                      ...form,
                      consent: { ...form.consent, policyUrl: event.target.value || null },
                    },
                  })
                }
              />
            </Field>
          </div>
        </Card>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function GenerationTab({
  preset,
  patch,
}: {
  preset: Preset;
  patch: (changes: Partial<Preset>) => void;
}) {
  const generation = preset.generation;
  const set = (changes: Partial<Preset["generation"]>) =>
    patch({ generation: { ...generation, ...changes } });

  const perGuest = estimateCostUsd(generation.variants, generation.resolution);

  return (
    <div className="space-y-6">
      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <Field
          label="Variants per guest"
          hint={`Each variant is a billed generation. About $${perGuest.toFixed(2)} per guest, before retries.`}
        >
          <Select
            value={String(generation.variants)}
            onChange={(event) => set({ variants: Number(event.target.value) })}
          >
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "(no pick step)" : "(guest picks one)"}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Resolution" hint="4K costs double and takes noticeably longer.">
          <Select
            value={generation.resolution}
            onChange={(event) =>
              set({ resolution: event.target.value as Preset["generation"]["resolution"] })
            }
          >
            <option value="1K">1K — fastest</option>
            <option value="2K">2K — recommended</option>
            <option value="4K">4K — print quality</option>
          </Select>
        </Field>

        <Field label="Retries allowed" hint="How many times a guest may regenerate.">
          <Input
            type="number"
            min={0}
            max={5}
            value={generation.retryLimit}
            onChange={(event) => set({ retryLimit: Number(event.target.value) })}
          />
        </Field>

        <Field label="Countdown (seconds)">
          <Input
            type="number"
            min={1}
            max={10}
            value={generation.countdownSec}
            onChange={(event) => set({ countdownSec: Number(event.target.value) })}
          />
        </Field>

        <Field
          label="Idle timeout (seconds)"
          hint="Inactivity before the booth warns, then returns to the idle screen."
        >
          <Input
            type="number"
            min={20}
            max={600}
            value={generation.idleTimeoutSec}
            onChange={(event) => set({ idleTimeoutSec: Number(event.target.value) })}
          />
        </Field>

        <Field
          label="Keep personal data for (days)"
          hint="A nightly job clears names, emails and photos past this age. 0 disables it."
        >
          <Input
            type="number"
            min={0}
            max={3650}
            value={preset.retention.days}
            onChange={(event) => patch({ retention: { days: Number(event.target.value) } })}
          />
        </Field>

        <div className="sm:col-span-2">
          <Toggle
            checked={generation.mirrorPreview}
            onChange={(mirrorPreview) => set({ mirrorPreview })}
            label="Mirror the camera preview (the saved photo is never mirrored)"
          />
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <Field
          label="House style"
          hint="Added to every prompt for this event — use it for a look you want across all styles, without editing each one."
        >
          <Textarea
            value={generation.styleSuffix}
            maxLength={600}
            placeholder="e.g. Warm golden colour grade with soft film grain."
            onChange={(event) => set({ styleSuffix: event.target.value })}
          />
        </Field>
      </Card>
    </div>
  );
}
