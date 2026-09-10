"use client";

import { useEffect, useState } from "react";
import { FittedPhoto } from "@/components/kiosk/FittedPhoto";
import { QrPanel } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";

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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <FittedPhoto
        src={finalUrl}
        alt="Your finished portrait"
        priority
        areaStyle={{ margin: "var(--space-4) var(--booth-gutter) 0" }}
      />

      <div style={{ flexShrink: 0, padding: "var(--space-4) var(--booth-gutter) 0" }}>
        <QrPanel qrSrc={qrDataUrl} shareUrl={shareUrl} />
      </div>

      <footer
        style={{
          flexShrink: 0,
          padding: "var(--space-4) var(--booth-gutter) var(--space-5)",
        }}
      >
        <Button full onClick={onDone}>
          Done
        </Button>
        <p
          style={{
            margin: "var(--space-2) 0 0",
            textAlign: "center",
            font: "var(--type-meta)",
            color: "var(--text-invert-muted)",
          }}
        >
          Returning to the start in {remaining}s
        </p>
      </footer>
    </div>
  );
}
