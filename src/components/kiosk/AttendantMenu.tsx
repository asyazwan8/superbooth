"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Overlay } from "@/components/ds/booth";
import { Button } from "@/components/ds/core";
import { useBoothMusic } from "@/hooks/useBoothMusic";

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
  const { muted, setMuted } = useBoothMusic();
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
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 50,
          width: 64,
          height: 64,
          opacity: 0,
          background: "none",
          border: "none",
        }}
      />

      {open ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <Overlay
            title="Attendant"
            body={
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
                aria-label="Attendant PIN"
                style={{
                  width: 220,
                  padding: "14px 16px",
                  textAlign: "center",
                  background: "var(--sb-paper)",
                  color: "var(--sb-ink)",
                  border: "var(--border-hard) solid var(--line-hard)",
                  borderRadius: "var(--radius-0)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 24,
                  letterSpacing: "0.4em",
                }}
              />
            }
          >
            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  font: "var(--type-label)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  color: "var(--sb-pink)",
                }}
              >
                {error}
              </p>
            ) : null}
            <Button full onClick={unlock} disabled={checking || pin.length === 0}>
              Open admin
            </Button>
            <Button
              full
              tone="secondary"
              onClick={() => {
                setOpen(false);
                onReset();
              }}
            >
              Reset session
            </Button>
            {/* Per-device and immediate, because the reason to reach for this
                is always the room: a speech starting, a DJ taking over, a
                booth sitting too close to a stage. It outlives the session
                and the page, so staff silence a booth once. */}
            <Button full tone="secondary" onClick={() => setMuted(!muted)}>
              {muted ? "Unmute music" : "Mute music"}
            </Button>
            <Button full tone="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </Overlay>
        </div>
      ) : null}
    </>
  );
}
