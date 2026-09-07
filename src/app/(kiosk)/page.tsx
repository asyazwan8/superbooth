import { AttractScreen } from "@/components/kiosk/AttractScreen";
import { getActivePresetOrDefault, sanitisePreset } from "@/lib/db";
import { falMockEnabled } from "@/lib/env";

// The live preset can change between guests, so this is never cached.
export const dynamic = "force-dynamic";

export default async function IdlePage() {
  const preset = await getActivePresetOrDefault();
  return <AttractScreen preset={sanitisePreset(preset)} mock={falMockEnabled()} />;
}
