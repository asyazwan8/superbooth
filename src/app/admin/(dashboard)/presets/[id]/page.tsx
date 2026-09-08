import { notFound } from "next/navigation";
import { PresetEditor } from "@/components/admin/PresetEditor";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preset = await (await getDb()).getPreset(id);
  if (!preset) notFound();

  return <PresetEditor initial={preset} />;
}
