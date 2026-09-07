import { BoothFlow } from "@/components/kiosk/BoothFlow";
import { getActivePresetOrDefault, sanitisePreset } from "@/lib/db";
import { falMockEnabled } from "@/lib/env";

/**
 * The preset is resolved on the server and handed to the flow as props, so the
 * booth never shows a loading state between "tap to start" and the first
 * question.
 */
export const dynamic = "force-dynamic";

export default async function BoothPage() {
  const preset = await getActivePresetOrDefault();
  return <BoothFlow preset={sanitisePreset(preset)} mock={falMockEnabled()} />;
}
