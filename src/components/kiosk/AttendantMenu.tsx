"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { BigButton } from "@/components/kiosk/BigButton";

/** Taps on the hidden corner needed to open the attendant prompt. */
const TAP_COUNT = 5;
/** Taps must land within this window, so stray touches never accumulate. */
const TAP_WINDOW_MS = 2_500;

/**
 * Staff escape hatch.
 *
 * A booth in fullscreen kiosk mode has no visible way out, which is the point
 * — but staff still need to reset a stuck session or reach the admin backend.
 * A hidden corner target plus a PIN keeps that available to them and invisible
 * to guests.
 *
 * The PIN is checked server-side: the kiosk is a public machine and anything
 * shipped to it is readable by anyone with a keyboard.
 */
export function AttendantMenu({ onReset }: { onReset: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const taps = useRef<number[]>([]);

  const registerTap = useCallback(() => {
    const now = Date.now();
    taps.current = [...taps.current, now].filter((time) => now - time < TAP_WINDOW_MS);
    if (taps.current.length >= TAP_COUNT) {
      taps.current = [];
      setOpen(true);
      setPin("");
      setError(null);
    }
  }, []);

  const unlock = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch("/api/booth/attendant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        setError("Incorrect PIN.");
        setPin("");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setChecking(false);
    }
  }, [pin, router]);

  return (
    <>
      {/* Deliberately invisible and unlabelled: guests must not discover it. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={registerTap}
        className="absolute right-0 top-0 z-50 h-16 w-16 opacity-0"
      />

      {open ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink-950/97 px-10">
          <h2 className="font-display text-2xl font-semibold text-ink-100">Attendant</h2>

          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void unlock();
            }}
            placeholder="PIN"
            className="w-48 rounded-2xl bg-ink-850 px-5 py-4 text-center text-2xl tracking-[0.4em] text-ink-100 sb-hairline focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="w-full space-y-3">
            <BigButton className="w-full" onClick={unlock} disabled={checking || pin.length === 0}>
              Open admin
            </BigButton>
            <BigButton
              variant="secondary"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onReset();
              }}
            >
              Reset session
            </BigButton>
            <BigButton variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Cancel
            </BigButton>
          </div>
        </div>
      ) : null}
    </>
  );
}
