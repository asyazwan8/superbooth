"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AttendantMenu } from "@/components/kiosk/AttendantMenu";
import { IdleOverlay } from "@/components/kiosk/IdleOverlay";
import { KioskFrame } from "@/components/kiosk/KioskFrame";
import type { StageGround } from "@/components/ds/booth";
import { Badge } from "@/components/ds/core";
import { CaptureStep } from "@/components/kiosk/steps/CaptureStep";
import { ChoiceStep } from "@/components/kiosk/steps/ChoiceStep";
import { DetailsStep } from "@/components/kiosk/steps/DetailsStep";
import { ErrorStep } from "@/components/kiosk/steps/ErrorStep";
import { GeneratingStep } from "@/components/kiosk/steps/GeneratingStep";
import { PickStep } from "@/components/kiosk/steps/PickStep";
import { ResultStep } from "@/components/kiosk/steps/ResultStep";
import { ReviewStep } from "@/components/kiosk/steps/ReviewStep";
import { useIdleReset } from "@/hooks/useIdleReset";
import { useKioskMode } from "@/hooks/useKioskMode";
import { readBoothMotion, stepVariants } from "@/lib/booth/motion";
import {
  optionsFor,
  progressSteps,
  stepSequence,
  type ChoiceKey,
  type StepId,
} from "@/lib/booth/steps";
import type { BoothOption, PublicPreset } from "@/lib/schema";

/**
 * The whole guest journey, as one client-side state machine.
 *
 * Deliberately not one route per step: page navigations on a kiosk mean a
 * flash of empty background between every tap, and browser history that Back
 * can walk out of. Holding the journey in state keeps transitions instant and
 * makes "start over" a single, reliable reset.
 */

const POLL_INTERVAL_MS = 1_200;
/** Long enough to cover a slow queue, short enough to not strand a guest. */
const GENERATION_TIMEOUT_MS = 180_000;
const RESULT_AUTO_RESET_SEC = 45;

/**
 * The stage colour each step sits on. Changing ground between steps is how the
 * journey reads as progress on a screen with no page transitions: paper while
 * the guest is working, ink once the booth is.
 */
const GROUNDS: Record<string, StageGround> = {
  details: "menu",
  scene: "menu",
  pose: "menu",
  treatment: "menu",
  capture: "stage",
  review: "menu",
  generating: "stage",
  pick: "stage",
  result: "stage",
  error: "purple",
};

interface SessionState {
  sessionId: string | null;
  photo: string | null;
  requestId: string | null;
  images: string[];
  finalUrl: string | null;
  qrDataUrl: string | null;
  shareUrl: string | null;
  attempts: number;
}

const EMPTY_SESSION: SessionState = {
  sessionId: null,
  photo: null,
  requestId: null,
  images: [],
  finalUrl: null,
  qrDataUrl: null,
  shareUrl: null,
  attempts: 0,
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function BoothFlow({ preset, mock }: { preset: PublicPreset; mock: boolean }) {
  const router = useRouter();
  const { engage } = useKioskMode();

  const sequence = stepSequence(preset);
  const progress = progressSteps(preset);

  const [step, setStepId] = useState<StepId>("details");
  // Which way the journey just moved, so a transition can carry the same
  // meaning the Back button does: forward enters from the right, Back from the
  // left. Held in state rather than a ref because it is read while rendering.
  const [direction, setDirection] = useState<1 | -1>(1);

  const setStep = useCallback((next: StepId, towards: 1 | -1 = 1) => {
    setDirection(towards);
    setStepId(next);
  }, []);

  const [fields, setFields] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [choices, setChoices] = useState<Record<ChoiceKey, string | null>>({
    scene: null,
    pose: null,
    treatment: null,
  });
  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const reset = useCallback(() => {
    setStep("details", -1);
    setFields({});
    setConsent(false);
    setChoices({ scene: null, pose: null, treatment: null });
    setSession(EMPTY_SESSION);
    setBusy(false);
    setError(null);
    setQueuePosition(null);
    setElapsedMs(0);
    // Pull any preset changes an operator made while this session ran.
    router.replace("/");
  }, [router, setStep]);

  // The idle watchdog is suspended while a generation is in flight — a guest
  // watching a progress bar is not idle, and resetting would abandon a request
  // that has already been paid for.
  const idle = useIdleReset({
    timeoutSec: preset.generation.idleTimeoutSec,
    enabled: step !== "generating" && step !== "result",
    onReset: reset,
  });

  const advance = useCallback(
    (from: StepId) => {
      const index = sequence.indexOf(from);
      const next = sequence[index + 1];
      if (next) setStep(next);
    },
    [sequence, setStep],
  );

  const goBack = useCallback(() => {
    const index = sequence.indexOf(step);
    const previous = sequence[index - 1];
    if (previous) setStep(previous, -1);
  }, [sequence, setStep, step]);

  /* ---------------------------------------------------------------- */
  /* Step actions                                                      */
  /* ---------------------------------------------------------------- */

  const submitDetails = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      void engage();
      const { sessionId } = await postJson<{ sessionId: string }>("/api/booth/session", {
        fields,
        consentAccepted: consent,
      });
      setSession((state) => ({ ...state, sessionId }));
      advance("details");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start your session.");
    } finally {
      setBusy(false);
    }
  }, [advance, consent, engage, fields]);

  const chooseOption = useCallback(
    (key: ChoiceKey, option: BoothOption) => {
      setChoices((current) => ({ ...current, [key]: option.id }));
      advance(key);
    },
    [advance],
  );

  const startGeneration = useCallback(
    async (sessionId: string) => {
      setStep("generating");
      setElapsedMs(0);
      setQueuePosition(null);
      const { requestId } = await postJson<{ requestId: string }>("/api/booth/generate", {
        sessionId,
        sceneId: choices.scene,
        poseId: choices.pose,
        treatmentId: choices.treatment,
      });
      setSession((state) => ({
        ...state,
        requestId,
        images: [],
        attempts: state.attempts + 1,
      }));
    },
    [choices, setStep],
  );

  const confirmPhoto = useCallback(async () => {
    if (!session.sessionId || !session.photo) return;
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/booth/upload", {
        sessionId: session.sessionId,
        dataUrl: session.photo,
      });
      await startGeneration(session.sessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send your photo.");
    } finally {
      setBusy(false);
    }
  }, [session.photo, session.sessionId, startGeneration]);

  const regenerate = useCallback(async () => {
    if (!session.sessionId) return;
    setBusy(true);
    setError(null);
    try {
      await startGeneration(session.sessionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not try again.");
    } finally {
      setBusy(false);
    }
  }, [session.sessionId, startGeneration]);

  const confirmVariant = useCallback(
    async (index: number) => {
      if (!session.sessionId) return;
      setBusy(true);
      setError(null);
      try {
        const result = await postJson<{
          finalUrl: string;
          shareUrl: string;
          qrDataUrl: string;
        }>("/api/booth/select", { sessionId: session.sessionId, index });
        setSession((state) => ({ ...state, ...result }));
        setStep("result");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not prepare your download.");
      } finally {
        setBusy(false);
      }
    },
    [session.sessionId, setStep],
  );

  /* ---------------------------------------------------------------- */
  /* Generation polling                                                */
  /* ---------------------------------------------------------------- */

  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (step !== "generating" || !session.requestId || !session.sessionId) return;

    const startedAt = Date.now();
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      setElapsedMs(Date.now() - startedAt);

      if (Date.now() - startedAt > GENERATION_TIMEOUT_MS) {
        setError("This is taking longer than expected. Please try again.");
        return;
      }

      try {
        const response = await fetch(
          `/api/booth/generate/${session.requestId}?sessionId=${session.sessionId}`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          state?: string;
          images?: string[];
          error?: string;
          queuePosition?: number | null;
        };

        if (cancelled) return;

        if (!response.ok || data.state === "FAILED") {
          setError(data.error ?? "The portrait could not be created.");
          return;
        }
        if (data.state === "COMPLETED" && data.images?.length) {
          setSession((state) => ({ ...state, images: data.images ?? [] }));
          // With a single variant there is nothing to choose between, so the
          // pick step is skipped and the image is finalised straight away.
          if (data.images.length === 1) {
            void confirmVariant(0);
          } else {
            setStep("pick");
          }
          return;
        }

        setQueuePosition(data.queuePosition ?? null);
      } catch {
        // Venue Wi-Fi drops constantly; a failed poll is not a failed
        // generation, so keep polling until the overall timeout.
      }

      pollRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);
    };

    pollRef.current = window.setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [confirmVariant, session.requestId, session.sessionId, setStep, step]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  const dotIndex = Math.max(0, progress.indexOf(step));
  const canRetry = session.attempts <= preset.generation.retryLimit;

  // A guest who has asked their operating system for less motion gets none:
  // the step still swaps, it just does not travel.
  const still = useReducedMotion() ?? false;
  // Read once per mount. The tokens do not change while a booth is running,
  // and reading them during render keeps the values available on the very
  // first transition rather than one step later.
  const timings = useMemo(() => readBoothMotion(), []);
  const variants = useMemo(() => stepVariants(timings, still), [still, timings]);

  // The error screen replaces whatever step raised it, so it is its own frame
  // in the transition rather than a silent swap of the step's contents.
  const frame = error ? "error" : step;

  const body = (() => {
    if (error) {
      return (
        <ErrorStep
          message={error}
          onRetry={session.photo && session.sessionId && canRetry ? regenerate : undefined}
          onStartOver={reset}
          busy={busy}
        />
      );
    }

    switch (step) {
      case "details":
        return (
          <DetailsStep
            preset={preset}
            values={fields}
            consent={consent}
            onChange={(key, value) => setFields((current) => ({ ...current, [key]: value }))}
            onConsentChange={setConsent}
            onSubmit={submitDetails}
            busy={busy}
            stepNumber={dotIndex + 1}
            stepTotal={progress.length}
          />
        );

      case "scene":
      case "pose":
      case "treatment":
        return (
          <ChoiceStep
            choiceKey={step}
            options={optionsFor(preset, step)}
            selectedId={choices[step]}
            onSelect={(option) => chooseOption(step, option)}
            onBack={goBack}
            dotsTotal={progress.length}
            dotsCurrent={dotIndex}
          />
        );

      case "capture":
        return (
          <CaptureStep
            countdownSec={preset.generation.countdownSec}
            mirror={preset.generation.mirrorPreview}
            onCaptured={(dataUrl) => {
              setSession((state) => ({ ...state, photo: dataUrl }));
              setStep("review");
            }}
            onBack={goBack}
            dotsTotal={progress.length}
            dotsCurrent={dotIndex}
          />
        );

      case "review":
        return session.photo ? (
          <ReviewStep
            photo={session.photo}
            busy={busy}
            onRetake={() => {
              setSession((state) => ({ ...state, photo: null }));
              setStep("capture", -1);
            }}
            onConfirm={confirmPhoto}
            onBack={() => setStep("capture", -1)}
            dotsTotal={progress.length}
            dotsCurrent={Math.max(0, progress.indexOf("capture"))}
          />
        ) : null;

      case "generating":
        return (
          <GeneratingStep
            queuePosition={queuePosition}
            elapsedMs={elapsedMs}
            logoUrl={preset.branding.logoUrl}
          />
        );

      case "pick":
        return (
          <PickStep
            images={session.images}
            onConfirm={confirmVariant}
            onRegenerate={regenerate}
            canRegenerate={canRetry}
            busy={busy}
          />
        );

      case "result":
        return session.finalUrl && session.qrDataUrl && session.shareUrl ? (
          <ResultStep
            finalUrl={session.finalUrl}
            qrDataUrl={session.qrDataUrl}
            shareUrl={session.shareUrl}
            autoResetSec={RESULT_AUTO_RESET_SEC}
            onDone={reset}
          />
        ) : null;

      default:
        return null;
    }
  })();

  return (
    <KioskFrame
      ground={GROUNDS[error ? "error" : step] ?? "stage"}
      accent={preset.branding.accent}
      accentSoft={preset.branding.accentSoft}
    >
      <AttendantMenu onReset={reset} />

      {/* Flush into the bottom-right corner, below every footer's own bottom
          padding — the one place no step's controls reach. The top right is
          the attendant hotspot and must stay unmarked. */}
      {mock ? (
        <span
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            zIndex: 40,
            pointerEvents: "none",
          }}
        >
          <Badge tone="warn">Demo</Badge>
        </span>
      ) : null}

      {/*
        `mode="wait"` rather than a crossfade: two screens on the stage at once
        means two copies of every control, which is wrong for a touchscreen a
        guest is already reaching for — and wrong for anything, a test runner
        included, that expects one "Continue" button. `initial={false}` keeps
        the first paint still; the booth's own slabs already slam in.
      */}
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        <motion.div
          key={frame}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          style={{ height: "100%" }}
        >
          {body}
        </motion.div>
      </AnimatePresence>

      {idle.warning && !error ? (
        <IdleOverlay countdown={idle.countdown} onStay={idle.dismiss} onReset={reset} />
      ) : null}
    </KioskFrame>
  );
}
