import { handle, ok } from "@/lib/api";
import { getActivePresetOrDefault, sanitisePreset } from "@/lib/db";
import { falMockEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

/** The kiosk's only configuration source. Polled on boot and after a reset. */
export async function GET() {
  return handle(async () => {
    const preset = await getActivePresetOrDefault();
    return ok({
      preset: sanitisePreset(preset),
      // Surfaced so the kiosk can show a "demo mode" badge and nobody
      // mistakes a rehearsal for a live booth.
      mock: falMockEnabled(),
    });
  });
}
