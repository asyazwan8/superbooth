"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SuperLogo } from "@/components/ds/booth";

export interface GalleryItem {
  id: string;
  url: string;
  createdAt: number;
}

/** How often the wall looks for new photos. */
const REFRESH_MS = 12_000;

/**
 * The live photo wall for a second monitor.
 *
 * New photos are prepended, so the most recent guest sees theirs appear top
 * left within seconds of finishing — which is what makes the wall pull a queue
 * rather than just decorate the corner. Polling rather than a socket keeps this
 * a static page that survives the venue Wi-Fi dropping.
 */
export function GalleryWall({ initial }: { initial: GalleryItem[] }) {
  const [items, setItems] = useState(initial);
  const [newest, setNewest] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/gallery", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as { items?: GalleryItem[] };
        if (cancelled || !data.items) return;

        setItems((current) => {
          const latest = data.items as GalleryItem[];
          if (latest[0] && latest[0].id !== current[0]?.id) setNewest(latest[0].id);
          return latest;
        });
      } catch {
        // A dropped poll just means the wall shows slightly stale photos.
      }
    };

    const timer = window.setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (items.length === 0) {
    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-8)",
          padding: "var(--space-10)",
          background: "var(--surface-invert)",
          backgroundImage: "var(--texture-halftone)",
          backgroundSize: "var(--texture-halftone-size)",
          color: "var(--text-invert)",
        }}
      >
        <SuperLogo height="180px" subline="Live gallery" />
        <p
          style={{
            margin: 0,
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label-wide)",
            textTransform: "uppercase",
            color: "var(--sb-gold)",
            animation: "sb-blink 1.4s steps(1, end) infinite",
          }}
        >
          Photos will appear here as guests finish.
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "var(--space-4)",
        background: "var(--surface-stage)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        }}
      >
        {items.map((item) => {
          const fresh = item.id === newest;
          return (
            <figure
              key={item.id}
              style={{
                position: "relative",
                margin: 0,
                aspectRatio: "9 / 16",
                overflow: "hidden",
                background: "var(--sb-ink-2)",
                // The newest photo is the only one edged in gold and lifted,
                // so a guest can find theirs from across the room. The house
                // ink rule is invisible here — the wall's ground is ink.
                border: `${fresh ? "var(--border-heavy)" : "var(--border-hard)"} solid ${
                  fresh ? "var(--sb-gold)" : "var(--sb-ink-3)"
                }`,
                transform: fresh ? "translate(-3px, -3px)" : undefined,
                transition: "all var(--dur-slam) var(--ease-snap)",
              }}
            >
              <Image
                src={item.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 16vw"
                style={{ objectFit: "cover" }}
                unoptimized
              />
            </figure>
          );
        })}
      </div>
    </main>
  );
}
