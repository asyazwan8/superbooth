"use client";

import { useState } from "react";

/**
 * The dashboard's chart primitives.
 *
 * Hand-built SVG rather than a charting library: these are three simple forms
 * and a library would cost more bundle than it saves code, while making the
 * mark specs below harder to hold to.
 *
 * Colour follows the data's job. Bar lengths already encode magnitude, so the
 * bars are a single hue — a ramp here would colour something already encoded.
 * The only two-class chart is the daily column, which is emphasis: completed
 * sessions in the accent, the remainder in a de-emphasis grey.
 *
 * The grey (#6b6b78) is not arbitrary: it is the lightest step that clears 3:1
 * against this dashboard's surface while keeping colour-vision separation from
 * the accent well above the ΔE 8 floor in all three CVD simulations.
 */

export const SERIES_ACCENT = "var(--color-accent)";
export const SERIES_MUTED = "#6b6b78";

/** Bars cap at 24px and keep a 2px surface gap where segments touch. */
const BAR_THICKNESS = 22;
const SURFACE_GAP = 2;
const RADIUS = 4;

/** Reserved rows above and below the bar track, so labels are never clipped. */
const LABEL_ROW = 20;
const DATE_ROW = 18;

export function ChartFrame({
  title,
  subtitle,
  legend,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
        </div>

        {/* A legend is always present for two or more series. */}
        {legend && legend.length > 1 ? (
          <ul className="flex items-center gap-4">
            {legend.map((entry) => (
              <li key={entry.label} className="flex items-center gap-1.5 text-xs text-ink-400">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: entry.color }}
                  aria-hidden="true"
                />
                {entry.label}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * Horizontal magnitude bars — funnel stages and option popularity.
 *
 * Values are labelled at the tip, outside the bar, so a label never has to be
 * clipped to fit inside a short one.
 */
export function BarList({
  rows,
  emptyMessage = "No data yet.",
}: {
  rows: { label: string; value: number }[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-600">{emptyMessage}</p>;
  }

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[7.5rem_1fr_2.5rem] items-center gap-3">
          <span className="truncate text-xs text-ink-400" title={row.label}>
            {row.label}
          </span>

          <span className="relative block h-5 rounded-sm bg-ink-850">
            <span
              className="absolute inset-y-0 left-0 rounded-r-[4px]"
              style={{
                width: `${Math.max((row.value / max) * 100, row.value > 0 ? 1.5 : 0)}%`,
                background: SERIES_ACCENT,
              }}
            />
          </span>

          <span className="text-right text-xs tabular-nums text-ink-300">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Daily volume as stacked columns: completed sessions against the rest.
 *
 * Only the busiest day is directly labelled — a number on every column is the
 * chaos the label rule warns about — and the hover tooltip carries the rest.
 */
export function DailyColumns({
  days,
}: {
  days: { date: string; total: number; completed: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (days.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-600">No sessions in this period.</p>;
  }

  const max = Math.max(...days.map((day) => day.total), 1);
  const height = 160;
  const busiest = days.reduce(
    (best, day, index) => (day.total > days[best].total ? index : best),
    0,
  );

  return (
    <div className="relative">
      {/* The value and date rows get reserved height of their own — sizing the
          track to the tallest bar alone clips the label above it. */}
      <div
        className="flex items-end gap-1.5 overflow-x-auto pb-1"
        style={{ height: height + LABEL_ROW + DATE_ROW }}
        onMouseLeave={() => setHover(null)}
      >
        {days.map((day, index) => {
          const totalHeight = (day.total / max) * height;
          const completedHeight = (day.completed / max) * height;
          // The remainder loses the gap so the two segments never touch.
          const remainder = Math.max(totalHeight - completedHeight - SURFACE_GAP, 0);

          return (
            <div
              key={day.date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              style={{ maxWidth: BAR_THICKNESS + 8 }}
              onMouseEnter={() => setHover(index)}
            >
              <span
                className="text-[10px] leading-none tabular-nums text-ink-300"
                style={{ height: LABEL_ROW, lineHeight: `${LABEL_ROW}px` }}
              >
                {index === busiest || hover === index ? day.total : ""}
              </span>

              <span
                className="flex w-full flex-col justify-end"
                style={{ height: totalHeight, maxWidth: BAR_THICKNESS }}
                aria-hidden="true"
              >
                {remainder > 0 ? (
                  <span
                    className="w-full rounded-t-[4px]"
                    style={{
                      height: remainder,
                      background: SERIES_MUTED,
                      marginBottom: SURFACE_GAP,
                      opacity: hover === null || hover === index ? 1 : 0.45,
                    }}
                  />
                ) : null}
                <span
                  className="w-full"
                  style={{
                    height: completedHeight,
                    background: SERIES_ACCENT,
                    // Square at the baseline, rounded only where the bar ends.
                    borderRadius: remainder > 0 ? 0 : `${RADIUS}px ${RADIUS}px 0 0`,
                    opacity: hover === null || hover === index ? 1 : 0.45,
                  }}
                />
              </span>

              <span
                className="w-full truncate text-center text-[9px] text-ink-600"
                style={{ height: DATE_ROW, lineHeight: `${DATE_ROW}px` }}
              >
                {day.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>

      {hover !== null ? (
        <div className="pointer-events-none absolute right-0 top-0 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-xs shadow-lg">
          <p className="text-ink-200">{days[hover].date}</p>
          <p className="mt-1 text-ink-400">
            {days[hover].completed} completed of {days[hover].total}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** A headline number. Not a one-bar chart. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-ink-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
