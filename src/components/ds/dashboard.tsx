"use client";

/**
 * Design-system components for the operator backend.
 *
 * A desk tool, so everything here is denser and hover-aware — the opposite of
 * the kiosk's thumb-sized targets. Styling stays inline against the tokens in
 * `src/styles/tokens`, the same idiom the design system ships.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "./core";

/* ------------------------------------------------------------------ NavBar */

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface NavBarProps {
  items?: NavItem[];
  /** `id` of the active item. Derived from the current path when omitted. */
  current?: string;
  email?: string;
  /**
   * Mode flags, e.g. ["Demo mode", "Local storage"]. Load-bearing rather than
   * decorative: an operator needs to know the booth is mocked before they
   * trust a number on this screen.
   */
  badges?: string[];
  /** Rendered at the far right — usually the sign-out form. */
  action?: React.ReactNode;
}

export function NavBar({
  items = [],
  current,
  email,
  badges = [],
  action,
}: NavBarProps) {
  // The shell that renders this is a server component holding the auth check,
  // so the active item is resolved here rather than passed down. Longest
  // matching href wins, so /admin/sessions does not also light up /admin.
  const pathname = usePathname();
  const active =
    current ??
    items
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.id;

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        // The deep purple, not ink: it still reads as a bar against the
        // shell without putting black back on the screen.
        background: "var(--sb-purple-deep)",
        borderBottom: "var(--border-hard) solid var(--sb-gold)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          maxWidth: 1240,
          margin: "0 auto",
          padding: "var(--space-3) var(--space-6)",
        }}
      >
        {/* Intrinsic dimensions, scaled down by CSS: passing a box that does
            not match the file's own ratio makes Next warn on every render. */}
        <Image
          src="/superbooth-logo.png"
          alt="Superbooth"
          width={1314}
          height={961}
          priority
          style={{ height: 34, width: "auto", display: "block" }}
        />

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
          }}
        >
          {items.map((item) => {
            const on = item.id === active;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className="sb-hover"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "var(--tap-min-desk)",
                  padding: "0 var(--space-4)",
                  textDecoration: "none",
                  background: on ? "var(--sb-gold)" : "transparent",
                  color: on ? "var(--sb-ink)" : "var(--text-invert-muted)",
                  border: `var(--border-hair) solid ${on ? "var(--line-hard)" : "transparent"}`,
                  transform: "skewX(var(--skew-brand))",
                  font: "var(--type-label)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    transform: "skewX(var(--skew-brand-counter))",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {badges.map((b) => (
            <Badge key={b} tone="warn">
              {b}
            </Badge>
          ))}
          {email ? (
            <span
              style={{
                font: "var(--type-meta)",
                fontSize: 12,
                color: "var(--text-invert-muted)",
              }}
            >
              {email}
            </span>
          ) : null}
          {action}
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- StatTile */

export type StatTone = "paper" | "gold" | "green" | "pink";

const STAT_TONES: Record<StatTone, React.CSSProperties> = {
  paper: { background: "var(--surface-panel)", color: "var(--text-strong)" },
  gold: { background: "var(--sb-gold)", color: "var(--sb-ink)" },
  green: { background: "var(--sb-green)", color: "var(--sb-ink)" },
  pink: { background: "var(--sb-pink)", color: "var(--sb-paper)" },
};

export interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}

/**
 * One headline number. A tile, not a chart: a single current value is what a
 * tile is for, and a one-bar bar chart says less in more space.
 */
export function StatTile({ label, value, hint, tone = "paper" }: StatTileProps) {
  return (
    <div
      style={{
        padding: "var(--space-4) var(--space-5) var(--space-5)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam-press)",
        ...STAT_TONES[tone],
      }}
    >
      <div
        style={{
          font: "var(--type-label)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          opacity: 0.75,
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: "var(--space-2)",
          fontFamily: "var(--font-display)",
          fontSize: 42,
          lineHeight: 0.92,
          letterSpacing: "var(--tracking-display)",
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: "var(--space-2)",
            font: "var(--type-meta)",
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- ChartFrame */

export interface LegendEntry {
  label: string;
  color: string;
}

export interface ChartFrameProps {
  title: string;
  subtitle?: string;
  legend?: LegendEntry[];
  children?: React.ReactNode;
}

/** The bordered box every chart sits in: title, optional subtitle and legend. */
export function ChartFrame({
  title,
  subtitle,
  legend = [],
  children,
}: ChartFrameProps) {
  return (
    <section
      style={{
        background: "var(--surface-panel)",
        color: "var(--text-strong)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam-press)",
        padding: "var(--space-5)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          marginBottom: "var(--space-5)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: 22,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            {title}
          </h2>
          {subtitle ? (
            <p
              style={{
                margin: "var(--space-2) 0 0",
                font: "var(--type-body-sm)",
                color: "var(--text-muted)",
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {legend.length ? (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: "var(--space-4)",
              flexShrink: 0,
            }}
          >
            {legend.map((entry) => (
              <span
                key={entry.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  font: "var(--type-label)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                }}
              >
                <i
                  style={{
                    width: 14,
                    height: 14,
                    background: entry.color,
                    border: "var(--border-hair) solid var(--line-hard)",
                  }}
                />
                {entry.label}
              </span>
            ))}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------- BarList */

export interface BarRow {
  label: string;
  value: number;
}

export interface BarListProps {
  rows?: BarRow[];
  emptyMessage?: string;
  color?: string;
}

/**
 * Ranked horizontal bars — funnel stages, most popular scenes, looks, styles.
 * The value is printed as well as plotted, so the chart is readable as text.
 */
export function BarList({
  rows = [],
  emptyMessage = "Nothing yet.",
  color = "var(--sb-pink)",
}: BarListProps) {
  if (!rows.length) {
    return (
      <p
        style={{
          margin: 0,
          font: "var(--type-body-sm)",
          color: "var(--text-muted)",
        }}
      >
        {emptyMessage}
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {rows.map((row) => (
        <div
          key={row.label}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(90px, 26%) 1fr auto",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <span
            style={{
              font: "var(--type-label)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.label}
          </span>
          <span
            style={{
              height: 22,
              background: "var(--surface-panel-sunk)",
              border: "var(--border-hair) solid var(--line-hard)",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${(row.value / max) * 100}%`,
                background: color,
                backgroundImage: "var(--texture-stripe)",
                transition: "width var(--dur-slam) var(--ease-out-hard)",
              }}
            />
          </span>
          <span
            style={{
              font: "var(--type-meta)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ DailyColumns */

export interface DayCount {
  date: string;
  total: number;
  completed: number;
}

/**
 * Sessions per day: completed stacked inside everything started, so the gap
 * between the two is the drop-off and needs no second chart.
 */
export function DailyColumns({ days = [] }: { days?: DayCount[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);
  // Only the busiest day is directly labelled — a number over every column is
  // noise — and every column carries the full count in its tooltip.
  const busiest = days.reduce(
    (best, day, index) => (day.total > (days[best]?.total ?? 0) ? index : best),
    0,
  );
  return (
    // Each column is full height with its contents pushed to the baseline, so
    // the bar's percentage height has a resolved parent to measure against —
    // against an auto-height parent a percentage collapses to nothing.
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: "var(--space-2)",
        height: 190,
      }}
    >
      {days.map((day, index) => (
        <div
          key={day.date}
          style={{
            flex: 1,
            // Capped, so a week with one day of data still reads as a column
            // rather than a band across the whole frame.
            maxWidth: 72,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            alignItems: "stretch",
            gap: "var(--space-2)",
          }}
          title={`${day.date}: ${day.completed} of ${day.total} completed`}
        >
          <span
            style={{
              flexShrink: 0,
              height: 16,
              lineHeight: "16px",
              textAlign: "center",
              font: "var(--type-meta)",
              fontSize: 11,
              fontVariantNumeric: "tabular-nums",
              color: "var(--text-muted)",
            }}
          >
            {index === busiest && day.total > 0 ? day.total : ""}
          </span>

          <div
            style={{
              position: "relative",
              flexShrink: 0,
              height: `${(day.total / max) * 100}%`,
              maxHeight: "calc(100% - 40px)",
              minHeight: 4,
              background: "var(--sb-purple-deep)",
              border: "var(--border-hair) solid var(--line-hard)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: `${day.total ? (day.completed / day.total) * 100 : 0}%`,
                background: "var(--sb-green)",
              }}
            />
          </div>
          <span
            style={{
              flexShrink: 0,
              font: "var(--type-label)",
              fontSize: 10,
              letterSpacing: 0,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            {day.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- StatusPill */

export type SessionStatusName =
  | "started"
  | "capturing"
  | "generating"
  | "ready"
  | "completed"
  | "failed"
  | "abandoned";

const STATUS_TONES: Record<string, React.CSSProperties> = {
  completed: { background: "var(--sb-green)", color: "var(--sb-ink)" },
  failed: { background: "var(--sb-pink)", color: "var(--sb-paper)" },
  generating: { background: "var(--sb-cyan)", color: "var(--sb-ink)" },
  ready: { background: "var(--sb-cyan)", color: "var(--sb-ink)" },
  capturing: { background: "var(--sb-gold)", color: "var(--sb-ink)" },
  started: { background: "var(--surface-panel-sunk)", color: "var(--text-muted)" },
  abandoned: {
    background: "var(--surface-panel-sunk)",
    color: "var(--text-muted)",
  },
};

/** Session status. The seven values the app's schema defines, and no others. */
export function StatusPill({ status }: { status: SessionStatusName }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 9px",
        border: "var(--border-hair) solid var(--line-hard)",
        font: "var(--type-label)",
        fontSize: 10,
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        ...(STATUS_TONES[status] ?? STATUS_TONES.started),
      }}
    >
      {status}
    </span>
  );
}

/* --------------------------------------------------------------- DataTable */

export interface Column<Row> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  /** Cell renderer; falls back to `row[key]` for plain string columns. */
  render?: (row: Row) => React.ReactNode;
}

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  /** Stable React key per row. */
  rowKey: (row: Row) => string;
}

/**
 * The sessions table.
 *
 * Dense rows with hard hairline rules rather than zebra striping — the flat
 * palette makes stripes read as state. Row actions stay visible instead of
 * hiding behind a menu, because "get that photo off the wall" and "give me the
 * mailing list" are the two jobs this screen does during a live event.
 */
export function DataTable<Row extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
}: DataTableProps<Row>) {
  return (
    <div
      className="sb-scroll-x"
      style={{
        background: "var(--surface-panel)",
        border: "var(--border-hard) solid var(--line-hard)",
        boxShadow: "var(--shadow-slam-press)",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          color: "var(--text-strong)",
        }}
      >
        <thead>
          <tr style={{ background: "var(--sb-ink)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{
                  padding: "var(--space-3)",
                  textAlign: col.align ?? "left",
                  font: "var(--type-label)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  color: "var(--sb-gold)",
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              style={{ borderTop: "var(--border-hair) solid var(--line-soft)" }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "var(--space-3)",
                    textAlign: col.align ?? "left",
                    font: "var(--type-body-sm)",
                    verticalAlign: "middle",
                  }}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
