import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DeleteRequestButton } from "@/components/result/DeleteRequestButton";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Superbooth portrait",
  // The link is shared by text and chat; a preview crawler indexing a guest's
  // face is not something they consented to.
  robots: { index: false, follow: false },
};

/**
 * What the QR code opens: one photo, one download button.
 *
 * Guests arrive here on a phone, in a hall, with one hand free. Anything that
 * is not the picture or the way to keep it has been left out on purpose.
 */
export default async function ResultPage({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const db = await getDb();
  const session = await db.getSessionByShortId(shortId);

  if (!session) notFound();

  // Checked before `finalUrl`, because purging clears it: a guest returning to
  // a link they deleted should be told it is gone, not shown a bare 404.
  if (session.purgedAt) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-100">This photo has expired</h1>
        <p className="text-ink-400">
          Photos are kept for a limited time and this one has now been deleted.
        </p>
      </main>
    );
  }

  if (!session.finalUrl) notFound();

  const name = session.fields.name?.split(" ")[0];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      <header className="mb-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-100">
          {name ? `Here you are, ${name}` : "Here's your portrait"}
        </h1>
        <p className="mt-1 text-sm text-ink-400">Tap and hold the image to save it, or use the button below.</p>
      </header>

      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl sb-hairline">
        <Image
          src={session.finalUrl}
          alt="Your Superbooth portrait"
          fill
          sizes="(max-width: 480px) 100vw, 480px"
          className="object-cover"
          unoptimized
          priority
        />
      </div>

      <a
        href={`/api/p/${session.shortId}/download`}
        className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-accent px-8 font-display text-lg font-semibold text-white"
      >
        Download photo
      </a>

      <footer className="mt-auto pt-10 text-center">
        <DeleteRequestButton shortId={session.shortId} />
      </footer>
    </main>
  );
}
