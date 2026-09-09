import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SuperLogo } from "@/components/ds/booth";
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
 *
 * This is the one surface the preset's accent colour paints — as the mount the
 * photo sits on, where nothing has to stay readable over it. The booth itself
 * keeps the design system's contrast-checked pairings.
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
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-5)",
          padding: "var(--space-6)",
          textAlign: "center",
          background: "var(--surface-stage)",
          color: "var(--text-invert)",
        }}
      >
        <h1
          style={{
            margin: 0,
            padding: "6px 20px 8px",
            background: "var(--sb-gold)",
            color: "var(--sb-ink)",
            border: "var(--border-hard) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam)",
            transform: "skewX(var(--skew-brand))",
            fontFamily: "var(--font-display)",
            fontSize: 28,
            lineHeight: 1,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
            This photo has expired
          </span>
        </h1>
        <p style={{ margin: 0, font: "var(--type-body)", maxWidth: "32ch" }}>
          Photos are kept for a limited time and this one has now been deleted.
        </p>
      </main>
    );
  }

  if (!session.finalUrl) notFound();

  const name = session.fields.name?.split(" ")[0];
  // The event's accent, if the preset still exists — a deleted preset must not
  // take a guest's link down with it.
  const accent = (await db.getPreset(session.presetId))?.branding.accent ?? "var(--sb-purple)";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: 520,
        margin: "0 auto",
        padding: "var(--space-6) var(--space-5) var(--space-8)",
        background: "var(--surface-stage)",
        color: "var(--text-invert)",
      }}
    >
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-5)",
          marginBottom: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <SuperLogo height="72px" />

        <h1
          style={{
            margin: 0,
            padding: "6px 20px 8px",
            background: "var(--sb-pink)",
            color: "var(--sb-paper)",
            border: "var(--border-hard) solid var(--line-hard)",
            boxShadow: "var(--shadow-slam)",
            transform: "skewX(var(--skew-brand))",
            fontFamily: "var(--font-display)",
            fontSize: 30,
            lineHeight: 1,
            textTransform: "uppercase",
            fontWeight: 400,
          }}
        >
          <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
            {name ? `Here you are, ${name}` : "Here's your portrait"}
          </span>
        </h1>

        <p style={{ margin: 0, font: "var(--type-body-sm)", color: "var(--text-invert-muted)" }}>
          Tap and hold the image to save it, or use the button below.
        </p>
      </header>

      <div
        style={{
          padding: "var(--space-4)",
          background: accent,
          border: "var(--border-heavy) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam-lg)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "9 / 16",
            overflow: "hidden",
            border: "var(--border-hard) solid var(--line-hard)",
            background: "var(--sb-ink-2)",
          }}
        >
          <Image
            src={session.finalUrl}
            alt="Your Superbooth portrait"
            fill
            sizes="(max-width: 520px) 100vw, 520px"
            style={{ objectFit: "cover" }}
            unoptimized
            priority
          />
        </div>
      </div>

      <a
        href={`/api/p/${session.shortId}/download`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "var(--tap-min)",
          marginTop: "var(--space-6)",
          padding: "0 32px",
          background: "var(--sb-green)",
          color: "var(--sb-ink)",
          textDecoration: "none",
          border: "var(--border-hard) solid var(--line-hard)",
          boxShadow: "var(--shadow-slam)",
          transform: "skewX(var(--skew-brand))",
          font: "var(--type-button)",
          letterSpacing: "var(--tracking-button)",
          textTransform: "uppercase",
        }}
      >
        <span style={{ display: "block", transform: "skewX(var(--skew-brand-counter))" }}>
          Download photo
        </span>
      </a>

      <footer style={{ marginTop: "auto", paddingTop: "var(--space-10)", textAlign: "center" }}>
        <DeleteRequestButton shortId={session.shortId} />
      </footer>
    </main>
  );
}
