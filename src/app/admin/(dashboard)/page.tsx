import { PresetList } from "@/components/admin/PresetList";
import { getDb } from "@/lib/db";
import { defaultPreset } from "@/lib/db/seed";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const db = await getDb();
  let presets = await db.listPresets();

  // A brand-new install has nothing to show; seed the demo so the operator
  // lands on something they can edit rather than an empty screen.
  if (presets.length === 0) {
    await db.savePreset(defaultPreset());
    presets = await db.listPresets();
  }

  return <PresetList presets={presets} />;
}
