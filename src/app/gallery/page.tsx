import { GalleryWall } from "@/components/gallery/GalleryWall";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The second-screen photo wall.
 *
 * Deliberately outside /admin: it runs unattended on a monitor beside the
 * booth, so it must not require a signed-in session. It shows only completed,
 * unhidden photos and carries no personal data — a wall in a public hall is
 * not the place for guest names.
 */
export default async function GalleryPage() {
  const db = await getDb();
  const sessions = await db.listSessions({ visibleOnly: true, completedOnly: true, limit: 60 });

  return (
    <GalleryWall
      initial={sessions
        .filter((session) => session.finalUrl)
        .map((session) => ({
          id: session.id,
          url: session.finalUrl as string,
          createdAt: session.createdAt,
        }))}
    />
  );
}
