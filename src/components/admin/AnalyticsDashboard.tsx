"use client";

import { useState } from "react";
import {
  BarList,
  ChartFrame,
  DailyColumns,
  SERIES_ACCENT,
  SERIES_MUTED,
  StatTile,
} from "@/components/admin/charts";
import { EmptyState } from "@/components/admin/ui";
import type { Analytics, OptionCount } from "@/lib/admin/analytics";

/** Option tallies carry a `count`; the bar list speaks in `value`. */
const toRows = (options: OptionCount[]) =>
  options.map((option) => ({ label: option.label, value: option.count }));

/**
 * Event analytics.
 *
 * The four headline numbers are stat tiles, not charts — a single current
 * value is what a tile is for, and a one-bar bar chart says less in more space.
 * A table view sits behind a toggle so every plotted number is also readable as
 * text, which is what keeps the charts accessible rather than decorative.
 */
export function AnalyticsDashboard({
  analytics,
  windowDays,
}: {
  analytics: Analytics;
  windowDays: number;
}) {
  const [showTable, setShowTable] = useState(false);

  if (analytics.total === 0) {
    return (
      <div className="space-y-6">
        <Header windowDays={windowDays} />
        <EmptyState
          title="Nothing to measure yet"
          body="Once guests start using the booth, completion rates, timings and the most popular options appear here."
        />
      </div>
    );
  }

  const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);

  return (
    <div className="space-y-6">
      <Header windowDays={windowDays} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sessions" value={String(analytics.total)} hint={`Last ${windowDays} days`} />
        <StatTile
          label="Completed"
          value={`${Math.round(analytics.completionRate * 100)}%`}
          hint={`${analytics.completed} guests got a photo`}
        />
        <StatTile
          label="Median generation"
          value={seconds(analytics.medianGenerationMs)}
          hint={`Whole session: ${seconds(analytics.medianSessionMs)}`}
        />
        <StatTile
          label="Estimated spend"
          value={`$${analytics.estimatedSpendUsd.toFixed(2)}`}
          hint={`${analytics.failed} failed · ${analytics.abandoned} abandoned`}
        />
      </div>

      <ChartFrame
        title="Sessions per day"
        subtitle="Completed against everything started."
        legend={[
          { label: "Completed", color: SERIES_ACCENT },
          { label: "Not completed", color: SERIES_MUTED },
        ]}
      >
        <DailyColumns days={analytics.perDay} />
      </ChartFrame>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame title="Where guests drop off" subtitle="Sessions reaching each stage.">
          <BarList rows={analytics.funnel.map((stage) => ({ label: stage.step, value: stage.count }))} />
        </ChartFrame>

        <ChartFrame title="Most popular styles">
          <BarList rows={toRows(analytics.treatments)} emptyMessage="No styles chosen yet." />
        </ChartFrame>

        <ChartFrame title="Most popular scenes">
          <BarList rows={toRows(analytics.scenes)} emptyMessage="No scenes chosen yet." />
        </ChartFrame>

        <ChartFrame title="Most popular looks">
          <BarList rows={toRows(analytics.poses)} emptyMessage="No looks chosen yet." />
        </ChartFrame>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          className="text-xs text-ink-400 underline underline-offset-4 hover:text-ink-100"
        >
          {showTable ? "Hide" : "Show"} the numbers as a table
        </button>

        {showTable ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-800 bg-ink-900">
            <table className="w-full text-sm">
              <caption className="sr-only">Sessions per day</caption>
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Started</th>
                  <th className="p-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {analytics.perDay.map((day) => (
                  <tr key={day.date} className="border-b border-ink-850 last:border-0">
                    <td className="p-3 text-ink-300">{day.date}</td>
                    <td className="p-3 tabular-nums text-ink-300">{day.total}</td>
                    <td className="p-3 tabular-nums text-ink-300">{day.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Header({ windowDays }: { windowDays: number }) {
  return (
    <header>
      <h1 className="font-display text-2xl font-semibold text-ink-100">Analytics</h1>
      <p className="mt-1 text-sm text-ink-400">Across all events, last {windowDays} days.</p>
    </header>
  );
}
