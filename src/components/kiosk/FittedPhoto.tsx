"use client";

import { useState, type CSSProperties } from "react";

/**
 * A photo shown whole, in a frame cut to its own shape.
 *
 * The booth's picture areas are whatever the stage has left over after a
 * header and a footer, which is not the shape of any photograph. Filling that
 * area with `cover` cropped a 9:16 portrait to the middle of itself — the
 * guest's own face, enlarged, with the outfit and the scene they picked cut
 * away. `contain` would trade the crop for bars inside the frame, which reads
 * as a layout fault rather than as a photo.
 *
 * So the frame takes the picture's shape and grows until whichever axis runs
 * out first. That is the same formula `BoothFrame` uses to letterbox the stage,
 * and for the same reason it gives there: **aspect-ratio cannot do this job.**
 * `aspect-ratio` with `height: 100%` and `max-width: 100%` looks right and is
 * right only while the area is wider than the picture; in a tall, narrow area
 * the max-width clamp resolves the second axis, at which point aspect-ratio is
 * ignored and the frame silently takes the area's shape instead of the
 * picture's — cropping exactly what this component exists to preserve. A pair
 * of `min()`s against a size container caps each axis by the other, which is
 * the thing aspect-ratio cannot express.
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
  /** Used until the browser reports the real one — the booth's own 9:16. */
  defaultAspect = 9 / 16,
  areaStyle,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  border?: string;
  shadow?: string;
  defaultAspect?: number;
  areaStyle?: CSSProperties;
}) {
  const [aspect, setAspect] = useState(defaultAspect);
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : defaultAspect;

  return (
    <div
      style={{
        flex: 1,
        // Without this the photo refuses to shrink below its content and
        // pushes the footer off a short stage — an operator's laptop, or a
        // kiosk in a browser with chrome.
        minHeight: 0,
        // A SIZE container, so the frame below can measure both of its own
        // axes. Nothing inside reads container units, so this does not
        // capture any `cqi` the booth's own sizing depends on.
        containerType: "size",
        display: "grid",
        placeItems: "center",
        ...areaStyle,
      }}
    >
      <div
        style={{
          position: "relative",
          // Fitted, never stretched, in either direction: whichever axis binds
          // wins and the other is derived from it.
          width: `min(100cqw, calc(100cqh * ${ratio}))`,
          height: `min(100cqh, calc(100cqw * ${1 / ratio}))`,
          overflow: "hidden",
          // Paper, not the house ink rule: these screens sit on the purple
          // ground, where an ink edge round a dark photo disappears into it.
          border,
          boxShadow: shadow,
          background: "var(--sb-purple-deep)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={alt}
          fetchPriority={priority ? "high" : undefined}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth && naturalHeight) setAspect(naturalWidth / naturalHeight);
          }}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            // The frame already matches the picture bar the border's own
            // thickness, so this crops nothing anyone can see — it only
            // guarantees the last sub-pixel is covered.
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
}
