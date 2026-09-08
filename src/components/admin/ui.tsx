"use client";

/**
 * Admin UI primitives.
 *
 * The backend shares the booth's palette but not its scale: this is a desk
 * tool used with a mouse, so controls are compact, dense and hover-aware —
 * the opposite of the kiosk's thumb-sized targets.
 */

type ButtonTone = "primary" | "secondary" | "ghost" | "danger";

const TONES: Record<ButtonTone, string> = {
  primary: "bg-accent text-white hover:brightness-110",
  secondary: "bg-ink-800 text-ink-100 hover:bg-ink-700",
  ghost: "text-ink-400 hover:bg-ink-850 hover:text-ink-100",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
};

export function Button({
  tone = "secondary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm
        font-medium transition disabled:pointer-events-none disabled:opacity-40
        ${TONES[tone]} ${className}`}
    />
  );
}

export function Card({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={`rounded-2xl border border-ink-800 bg-ink-900 ${className}`}>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-ink-500">{hint}</span> : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-sm text-ink-100 " +
  "placeholder:text-ink-600 focus:border-accent focus:outline-none";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${props.className ?? ""}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${CONTROL} min-h-24 resize-y leading-relaxed ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${CONTROL} ${props.className ?? ""}`} />;
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-sm text-ink-200"
    >
      <span
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-accent" : "bg-ink-700"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all
            ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
      {label}
    </button>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-700 px-6 py-12 text-center">
      <p className="font-display text-base font-semibold text-ink-200">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">{body}</p>
    </div>
  );
}
