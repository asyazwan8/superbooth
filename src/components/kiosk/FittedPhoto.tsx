"use client";

import type { CSSProperties } from "react";

/**
 * A photo shown whole, in a frame cut to its own shape.
 *
 * The booth's picture areas are whatever the stage has left over after a
 * header and a footer, which is not the shape of any photograph. Filling that
 * area with `cover` cropped a 9:16 portrait to the middle of itself — the
 * guest's own face, enlarged, with the outfit and the scene they picked cut
 * away. `contain` would trade the cropping for bars inside the frame, which
 * reads as a layout fault rather than as a photo.
 *
 * So the frame is the picture. The image sizes itself against the space and
 * keeps its own aspect, and the border and shadow are drawn on it, so there is
 * nothing to crop and nothing to letterbox at any aspect — a 9:16 render, a
 * 4:3 capture, or whatever a model hands back next.
 *
 * A plain `img` rather than `next/image`: every source here is a signed FAL or
 * mock URL passed with `unoptimized`, so the component contributes nothing but
 * a wrapper that has to be given a size in advance — which is the one thing
 * this cannot know.
 */
export function FittedPhoto({
  src,
  alt,
  priority = false,
  border = "var(--border-heavy) solid var(--sb-paper)",
  shadow,
  areaStyle,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  border?: string;
  shadow?: string;
  areaStyle?: CSSProperties;
}) {
  return (
    <div
      style={{
        flex: 1,
        // Without this the photo refuses to shrink below its content and
        // pushes the footer off a short stage — an operator's laptop, or a
        // kiosk in a browser with chrome.
        minHeight: 0,
        display: "grid",
        placeItems: "center",
        ...areaStyle,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        fetchPriority={priority ? "high" : undefined}
        style={{
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
          // Paper, not the house ink rule: these screens sit on the ink stage,
          // where a black edge round a dark photo is no edge at all.
          border,
          boxShadow: shadow,
          background: "var(--sb-ink-2)",
        }}
      />
    </div>
  );
}
