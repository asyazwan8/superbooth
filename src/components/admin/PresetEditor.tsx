"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { KioskPreview } from "@/components/admin/KioskPreview";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { TestGenerate } from "@/components/admin/TestGenerate";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Select,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { Badge } from "@/components/ds/core";
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

const TABS = ["Branding", "Guest form", "Themes", "Generation"] as const;
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
    themes: preset.themes
      .filter((theme) => theme.enabled)
      .map((theme) => ({
        ...theme,
        customisations: theme.customisations
          .filter((slot) => slot.enabled)
          .map((slot) => ({ ...slot, options: slot.options.filter((option) => option.enabled) })),
      })),
    form: { ...preset.form, fields: preset.form.fields.filter((field) => field.enabled) },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {/* The name is edited in place, as a title rather than a form field —
              renaming an event is a one-word change, not a trip to a modal. */}
          <Input
            value={preset.name}
            onChange={(event) => patch({ name: event.target.value })}
            aria-label="Event name"
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              color: "var(--text-invert)",
              fontFamily: "var(--font-display)",
              fontSize: 30,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          />
          <p
            style={{
              margin: "var(--space-2) 0 0",
              font: "var(--type-meta)",
              fontSize: 12,
              color: "var(--text-invert-muted)",
            }}
          >
            {preset.isActive ? "This event is live on the booth." : "Draft — not live."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {dirty ? (
            <Badge tone="warn">Unsaved changes</Badge>
          ) : savedAt ? (
            <Badge tone="positive">Saved</Badge>
          ) : null}
          <Button tone="primary" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </header>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-1)",
          borderBottom: "var(--border-hard) solid var(--sb-gold)",
        }}
      >
        {TABS.map((entry) => {
          const on = tab === entry;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className="sb-hover"
              style={{
                marginBottom: -3,
                minHeight: "var(--tap-min-desk)",
                padding: "0 var(--space-4)",
                cursor: "pointer",
                background: on ? "var(--sb-gold)" : "transparent",
                color: on ? "var(--sb-ink)" : "var(--text-invert-muted)",
                border: "var(--border-hard) solid",
                borderColor: on ? "var(--line-hard)" : "transparent",
                borderBottomColor: on ? "var(--sb-gold)" : "transparent",
                font: "var(--type-label)",
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
              }}
            >
              {entry}
            </button>
          );
        })}
      </nav>

      <div
        className="sb-split"
        style={{
          display: "grid",
          gap: "var(--space-8)",
          gridTemplateColumns: "minmax(0, 1fr) 280px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {tab === "Branding" ? <BrandingTab preset={preset} patch={patch} /> : null}
          {tab === "Guest form" ? <FormTab preset={preset} patch={patch} /> : null}

          {tab === "Themes" ? (
            <ThemeEditor
              themes={preset.themes}
              config={preset.flow.theme}
              onChange={(themes) => patch({ themes })}
              onConfigChange={(theme) => patch({ flow: { ...preset.flow, theme } })}
            />
          ) : null}

          {tab === "Generation" ? <GenerationTab preset={preset} patch={patch} /> : null}
        </div>

        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
            position: "sticky",
            top: 88,
          }}
        >
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* alignItems start so the short masthead card does not stretch to match
          the tall 9:16 overlay preview beside it. */}
      <div
        className="sb-split"
        style={{
          display: "grid",
          alignItems: "start",
          gap: "var(--space-6)",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        <Card style={{ padding: "var(--space-4)" }}>
          <SectionTitle>Masthead</SectionTitle>
          <p
            style={{
              margin: "var(--space-3) 0",
              font: "var(--type-body-sm)",
              color: "var(--text-muted)",
            }}
          >
            Shown on the idle screen and while a portrait renders. Leave empty to
            use the Superbooth wordmark.
          </p>
          <ImageUploadField
            value={branding.logoUrl}
            kind="logo"
            frameStyle={{ aspectRatio: "3 / 2", width: "100%" }}
            emptyLabel="Logo (PNG with transparency)"
            onChange={(logoUrl) => set({ logoUrl })}
          />
        </Card>

        <Card style={{ padding: "var(--space-4)" }}>
          <SectionTitle>Photo overlay</SectionTitle>
          <p
            style={{
              margin: "var(--space-3) 0",
              font: "var(--type-body-sm)",
              color: "var(--text-muted)",
            }}
          >
            A transparent 1080×1920 PNG composited onto every finished photo.
          </p>
          <ImageUploadField
            value={branding.overlayUrl}
            kind="overlay"
            frameStyle={{ aspectRatio: "9 / 16", height: 288 }}
            emptyLabel="Overlay (1080×1920 PNG)"
            onChange={(overlayUrl) => set({ overlayUrl, overlayEnabled: Boolean(overlayUrl) })}
          />
          <div style={{ marginTop: "var(--space-3)" }}>
            <Toggle
              checked={branding.overlayEnabled}
              onChange={(overlayEnabled) => set({ overlayEnabled })}
              label="Apply overlay to photos"
            />
          </div>
        </Card>
      </div>

      <Card
        className="sb-split"
        style={{
          display: "grid",
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          padding: "var(--space-4)",
        }}
      >
        <Field
          label="Accent colour"
          hint="The mount colour behind the photo on the shared result page. The booth keeps the Superbooth palette, whose contrast pairings are fixed."
        >
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="color"
              value={branding.accent}
              onChange={(event) => set({ accent: event.target.value })}
              aria-label="Accent colour"
              style={{
                height: 40,
                width: 52,
                padding: 2,
                background: "var(--surface-panel)",
                border: "var(--border-hard) solid var(--line-hard)",
                cursor: "pointer",
              }}
            />
            <Input value={branding.accent} onChange={(event) => set({ accent: event.target.value })} />
          </div>
        </Field>

        <Field label="Secondary accent" hint="A second event colour, available to the result page and exports.">
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="color"
              value={branding.accentSoft}
              onChange={(event) => set({ accentSoft: event.target.value })}
              aria-label="Secondary accent colour"
              style={{
                height: 40,
                width: 52,
                padding: 2,
                background: "var(--surface-panel)",
                border: "var(--border-hard) solid var(--line-hard)",
                cursor: "pointer",
              }}
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div>
          <SectionTitle>What you collect</SectionTitle>
          <p
            style={{
              margin: "var(--space-3) 0 0",
              font: "var(--type-body-sm)",
              color: "var(--text-invert-muted)",
            }}
          >
            Every field is one more thing between a guest and their photo. Two is usually right.
          </p>
        </div>

        {form.fields.map((field) => (
          <Card
            key={field.id}
            className="sb-split"
            style={{
              display: "grid",
              gap: "var(--space-3)",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 120px auto",
              alignItems: "start",
              padding: "var(--space-4)",
            }}
          >
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
                aria-label="Field type"
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                paddingTop: 26,
              }}
            >
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

      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div>
          <SectionTitle>Consent</SectionTitle>
          <p
            style={{
              margin: "var(--space-3) 0 0",
              font: "var(--type-body-sm)",
              color: "var(--text-invert-muted)",
            }}
          >
            The exact wording shown is stored with every session. Bump the version whenever you
            change it, so older records stay tied to the text those guests actually agreed to.
          </p>
        </div>

        <Card
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
          }}
        >
          <Field label="Consent text">
            <Textarea
              value={form.consent.text}
              maxLength={2000}
              style={{ minHeight: 128 }}
              onChange={(event) =>
                patch({ form: { ...form, consent: { ...form.consent, text: event.target.value } } })
              }
            />
          </Field>

          <div
            className="sb-split"
            style={{
              display: "grid",
              gap: "var(--space-4)",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
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
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <Card className="sb-split"
        style={{
          display: "grid",
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          alignItems: "start",
          padding: "var(--space-4)",
        }}>
        <Field
          label="Variants per guest"
          hint={`Each variant is a billed generation. About $${perGuest.toFixed(2)} per guest, before retries.`}
        >
          <Select
            aria-label="Variants per guest"
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
            aria-label="Resolution"
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

        <div style={{ gridColumn: "1 / -1" }}>
          <Toggle
            checked={generation.mirrorPreview}
            onChange={(mirrorPreview) => set({ mirrorPreview })}
            label="Mirror the camera preview (the saved photo is never mirrored)"
          />
        </div>
      </Card>

      <Card style={{ padding: "var(--space-4)" }}>
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
