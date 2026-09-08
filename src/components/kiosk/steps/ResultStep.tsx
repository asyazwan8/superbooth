"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BigButton } from "@/components/kiosk/BigButton";

/**
 * The payoff screen: the finished portrait and the QR that takes it home.
 *
 * The QR is the largest element after the photo itself, because this screen
 * has one job and a guest holding a phone at arm's length in a crowded hall
 * needs a target they can hit first time. A visible auto-return countdown
 * means the booth frees itself for the next guest without an attendant having
 * to hover.
 */
export function ResultStep({
  finalUrl,
  qrDataUrl,
  shareUrl,
  autoResetSec,
  onDone,
}: {
  finalUrl: string;
  qrDataUrl: string;
  shareUrl: string;
  autoResetSec: number;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(autoResetSec);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          onDone();
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // onDone is stable for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden px-6 pt-6">
        <div className="relative h-full w-full overflow-hidden rounded-3xl sb-hairline">
          <Image
            src={finalUrl}
            alt="Your finished portrait"
            fill
            sizes="100vw"
            className="object-cover"
            unoptimized
            priority
          />
        </div>
      </div>

      <div className="shrink-0 px-6 pt-5">
        <div className="flex items-center gap-5 rounded-3xl bg-ink-850 p-5 sb-hairline">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white p-1.5">
            <Image src={qrDataUrl} alt="QR code to download your photo" fill className="object-contain" unoptimized />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold text-ink-100">Scan to download</p>
            <p className="mt-1 text-sm text-ink-400">Point your phone camera at the code.</p>
            <p className="mt-2 truncate text-xs text-ink-600">{shareUrl}</p>
          </div>
        </div>
      </div>

      <footer className="shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <BigButton className="w-full" onClick={onDone}>
          Done
        </BigButton>
        <p className="mt-3 text-center text-sm text-ink-600">
          Returning to the start in {remaining}s
        </p>
      </footer>
    </div>
  );
}
