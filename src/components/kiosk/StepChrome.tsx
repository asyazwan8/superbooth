"use client";

/**
 * Shared framing for every guest step: a title block at the top and a fixed
 * bar at the bottom holding Back and the primary action.
 *
 * Keeping Back in the same place on every screen is what makes it trustworthy
 * on a touchscreen — a guest should never have to look for it, and it must
 * never sit where a mis-tap hits the primary action instead.
 */

export function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-7 pb-6 pt-2">
      <h1 className="font-display text-3xl font-semibold leading-tight text-ink-100">{title}</h1>
      {subtitle ? <p className="mt-2 text-base text-ink-400">{subtitle}</p> : null}
    </header>
  );
}

export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === current
              ? "w-7 bg-accent"
              : index < current
                ? "w-1.5 bg-ink-500"
                : "w-1.5 bg-ink-700"
          }`}
        />
      ))}
    </div>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-800 text-ink-300 transition active:bg-ink-700 active:text-ink-100"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          d="M15 5 8 12l7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * The bottom bar. `back` is rendered as a spacer when unavailable so the dots
 * stay optically centred instead of jumping between steps.
 */
export function StepFooter({
  onBack,
  dots,
  action,
}: {
  onBack?: () => void;
  dots?: React.ReactNode;
  /** Primary action rendered above the back/progress row. */
  action?: React.ReactNode;
}) {
  return (
    <footer className="mt-auto shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
      {action ? <div className="mb-4">{action}</div> : null}
      <div className="flex items-center gap-4">
        {onBack ? <BackButton onClick={onBack} /> : <span className="h-14 w-14 shrink-0" />}
        <div className="flex-1">{dots}</div>
        <span className="h-14 w-14 shrink-0" />
      </div>
    </footer>
  );
}
