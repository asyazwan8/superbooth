"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { SuperboothLogo } from "@/components/brand/SuperboothLogo";

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
      <main className="@container flex min-h-dvh flex-col items-center justify-center gap-8 bg-ink-950 px-10">
        <div className="w-full max-w-sm">
          <SuperboothLogo subline="Live gallery" />
        </div>
        <p className="text-ink-500">Photos will appear here as guests finish.</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-ink-950 p-4">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <figure
            key={item.id}
            className={`relative aspect-[9/16] overflow-hidden rounded-xl sb-hairline transition
              ${item.id === newest ? "ring-2 ring-accent" : ""}`}
          >
            <Image
              src={item.url}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 16vw"
              className="object-cover"
              unoptimized
            />
          </figure>
        ))}
      </div>
    </main>
  );
}
