import { badRequest, handle, ok, readJson } from "@/lib/api";
import { getActivePresetOrDefault, getDb } from "@/lib/db";
import { newSessionId, newShortId } from "@/lib/ids";
import { createSessionBodySchema, sessionSchema, type FormField } from "@/lib/schema";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Validate guest input against the preset's configured fields.
 *
 * Validation is repeated here rather than trusted from the client because the
 * form is operator-configurable: the kiosk could be running a stale preset
 * after a mid-event config change, and the record we keep for PDPA purposes
 * has to match what the preset actually asked for.
 */
function validateFields(
  fields: FormField[],
  submitted: Record<string, string>,
): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const field of fields) {
    if (!field.enabled) continue;
    const value = (submitted[field.key] ?? "").trim();

    if (!value) {
      if (field.required) throw badRequest(`${field.label} is required.`);
      continue;
    }
    if (value.length > 200) {
      throw badRequest(`${field.label} is too long.`);
    }
    if (field.type === "email" && !EMAIL_PATTERN.test(value)) {
      throw badRequest("That doesn't look like a valid email address.");
    }
    cleaned[field.key] = value;
  }

  return cleaned;
}

export async function POST(request: Request) {
  return handle(async () => {
    const body = createSessionBodySchema.parse(await readJson(request));
    const preset = await getActivePresetOrDefault();

    if (!body.consentAccepted) {
      throw badRequest("Consent is required before continuing.");
    }

    const fields = validateFields(preset.form.fields, body.fields);
    const now = Date.now();

    const session = sessionSchema.parse({
      id: newSessionId(),
      shortId: newShortId(),
      presetId: preset.id,
      presetName: preset.name,
      fields,
      consent: {
        accepted: true,
        version: preset.form.consent.version,
        // The exact wording shown is stored, not just a version number: a
        // consent record is only defensible if it says what was agreed to.
        text: preset.form.consent.text,
        acceptedAt: now,
      },
      choices: { themeId: null, customisations: {} },
      status: "started",
      timings: { startedAt: now },
      createdAt: now,
      expiresAt: preset.retention.days > 0 ? now + preset.retention.days * 86_400_000 : null,
    });

    const db = await getDb();
    await db.createSession(session);

    return ok({ sessionId: session.id, shortId: session.shortId });
  });
}
