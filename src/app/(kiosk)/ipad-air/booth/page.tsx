import { BoothFlow } from "@/components/kiosk/BoothFlow";
import { getActivePresetOrDefault, sanitisePreset } from "@/lib/db";
import { falMockEnabled } from "@/lib/env";

// Resolved on the server, as on `/booth`, so there is no loading state between
// "tap to start" and the first question.
export const dynamic = "force-dynamic";

export default async function IpadAirBoothPage() {
  const preset = await getActivePresetOrDefault();
  return <BoothFlow preset={sanitisePreset(preset)} mock={falMockEnabled()} />;
}
