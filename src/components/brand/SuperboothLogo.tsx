/**
 * Placeholder Superbooth wordmark.
 *
 * Drawn as inline SVG rather than shipped as a file so it inherits the preset
 * accent colour and stays crisp at attract-screen size. Replace it by setting
 * `branding.logoUrl` in the admin backend — no code change needed.
 */

export function SuperboothMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* A 9:16 frame, echoing the booth's output format. */}
      <rect
        x="18.5"
        y="6.5"
        width="27"
        height="51"
        rx="8"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.35"
      />
      {/* Aperture / lens at the optical centre. */}
      <circle cx="32" cy="27" r="9.5" stroke="currentColor" strokeWidth="3" />
      <circle cx="32" cy="27" r="3.5" fill="currentColor" />
      {/* Flash spark. */}
      <path
        d="M33.6 39.5 26 50.5h5.2L29.8 58l8-11.5h-5.4l1.2-7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SuperboothLogo({
  className = "",
  subline,
}: {
  className?: string;
  subline?: string;
}) {
  // Sized in container units so the lockup fits any stage width — at a fixed
  // size the wordmark overflows a narrow booth screen and gets clipped.
  return (
    <div className={`flex w-full flex-col items-center gap-4 ${className}`}>
      <div className="flex w-full items-center justify-center gap-[3cqi]">
        <SuperboothMark className="h-[11cqi] w-[11cqi] shrink-0 text-accent" />
        <span className="font-display text-[clamp(1.25rem,8.2cqi,3.5rem)] font-semibold tracking-[0.14em] text-ink-100">
          SUPER<span className="text-accent">BOOTH</span>
        </span>
      </div>
      {subline ? (
        <span className="text-sm uppercase tracking-[0.42em] text-ink-400">{subline}</span>
      ) : null}
    </div>
  );
}
