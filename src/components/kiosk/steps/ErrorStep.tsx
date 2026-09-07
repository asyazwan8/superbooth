"use client";

import { BigButton } from "@/components/kiosk/BigButton";

/**
 * The failure screen.
 *
 * A guest should never see a stack trace, a status code, or the word
 * "moderation". They get one sentence about what happened, and two ways
 * forward — try the same photo again, or start over — so nobody is left
 * staring at a dead booth waiting for staff.
 */
export function ErrorStep({
  message,
  onRetry,
  onStartOver,
  busy,
}: {
  message: string;
  onRetry?: () => void;
  onStartOver: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-10 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-850 sb-hairline">
        <svg viewBox="0 0 24 24" className="h-9 w-9 text-warn" aria-hidden="true">
          <path
            d="M12 8v5m0 3.5v.01M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20.4h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-8 font-display text-3xl font-semibold text-ink-100">
        That didn&apos;t work
      </h1>
      <p className="mt-3 max-w-xs text-base leading-relaxed text-ink-400">{message}</p>

      <div className="mt-10 w-full space-y-3">
        {onRetry ? (
          <BigButton className="w-full" onClick={onRetry} disabled={busy}>
            {busy ? "Trying again…" : "Try again"}
          </BigButton>
        ) : null}
        <BigButton variant="secondary" className="w-full" onClick={onStartOver} disabled={busy}>
          Start over
        </BigButton>
      </div>
    </div>
  );
}
