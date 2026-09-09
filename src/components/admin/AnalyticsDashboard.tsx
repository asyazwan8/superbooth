"use client";

import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import {
  BarList,
  ChartFrame,
  DailyColumns,
  DataTable,
  StatTile,
  type Column,
} from "@/components/ds/dashboard";
import type { Analytics, OptionCount } from "@/lib/admin/analytics";

/** Option tallies carry a `count`; the bar list speaks in `value`. */
const toRows = (options: OptionCount[]) =>
  options.map((option) => ({ label: option.label, value: option.count }));

const DAY_COLUMNS: Column<{ date: string; total: number; completed: number }>[] = [
  { key: "date", label: "Date" },
  { key: "total", label: "Started", align: "right" },
  { key: "completed", label: "Completed", align: "right" },
];

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

  const header = (
    <PageHeader title="Analytics" subtitle={`Across all events, last ${windowDays} days.`} />
  );

  if (analytics.total === 0) {
    return (
      <div>
        {header}
        <EmptyState
          title="Nothing to measure yet"
          body="Once guests start using the booth, completion rates, timings and the most popular options appear here."
        />
      </div>
    );
  }

  const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);

  return (
    <div>
      {header}

      <div
        style={{
          display: "grid",
          gap: "var(--space-3)",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: "var(--space-5)",
        }}
      >
        <StatTile
          label="Sessions"
          value={String(analytics.total)}
          hint={`Last ${windowDays} days`}
        />
        <StatTile
          tone="green"
          label="Completed"
          value={`${Math.round(analytics.completionRate * 100)}%`}
          hint={`${analytics.completed} guests got a photo`}
        />
        <StatTile
          label="Median generation"
          value={seconds(analytics.medianGenerationMs)}
          hint={`Whole session: ${seconds(analytics.medianSessionMs)}`}
        />
        {/* Spend is gold because it is the number an operator is answerable
            for; the rest are diagnostics. */}
        <StatTile
          tone="gold"
          label="Estimated spend"
          value={`$${analytics.estimatedSpendUsd.toFixed(2)}`}
          hint={`${analytics.failed} failed · ${analytics.abandoned} abandoned`}
        />
      </div>

      <div style={{ marginBottom: "var(--space-5)" }}>
        <ChartFrame
          title="Sessions per day"
          subtitle="Completed against everything started."
          legend={[
            { label: "Completed", color: "var(--sb-green)" },
            { label: "Not completed", color: "var(--sb-ink-3)" },
          ]}
        >
          <DailyColumns days={analytics.perDay} />
        </ChartFrame>
      </div>

      <div
        className="sb-split"
        style={{
          display: "grid",
          gap: "var(--space-4)",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          marginBottom: "var(--space-5)",
        }}
      >
        <ChartFrame title="Where guests drop off" subtitle="Sessions reaching each stage.">
          <BarList
            color="var(--sb-cyan)"
            rows={analytics.funnel.map((stage) => ({ label: stage.step, value: stage.count }))}
          />
        </ChartFrame>

        <ChartFrame title="Most popular styles">
          <BarList rows={toRows(analytics.treatments)} emptyMessage="No styles chosen yet." />
        </ChartFrame>

        <ChartFrame title="Most popular scenes">
          <BarList
            color="var(--sb-violet)"
            rows={toRows(analytics.scenes)}
            emptyMessage="No scenes chosen yet."
          />
        </ChartFrame>

        <ChartFrame title="Most popular looks">
          <BarList
            color="var(--sb-orange)"
            rows={toRows(analytics.poses)}
            emptyMessage="No looks chosen yet."
          />
        </ChartFrame>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((open) => !open)}
          className="sb-hover"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            font: "var(--type-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            color: "var(--text-invert)",
            textDecoration: "underline",
            textDecorationColor: "var(--sb-pink)",
            textUnderlineOffset: 4,
          }}
        >
          {showTable ? "Hide" : "Show"} the numbers as a table
        </button>

        {showTable ? (
          <div style={{ marginTop: "var(--space-3)" }}>
            <DataTable
              columns={DAY_COLUMNS}
              rows={analytics.perDay}
              rowKey={(day) => day.date}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
