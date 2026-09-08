"use client";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_10px_40px_-10px_var(--color-accent)] active:brightness-110",
  secondary: "bg-ink-800 text-ink-100 sb-hairline active:bg-ink-700",
  ghost: "bg-transparent text-ink-300 active:text-ink-100",
};

/**
 * The booth's only button.
 *
 * Sized for a standing guest tapping with a thumb on a vertical screen: a
 * 4rem minimum height, generous horizontal padding, and no hover-only
 * affordances — a touchscreen has no hover, so every state that matters is
 * expressed through the active/disabled styles.
 */
export function BigButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`flex min-h-16 select-none items-center justify-center gap-3 rounded-full px-8
        font-display text-lg font-semibold tracking-wide transition-all duration-150
        disabled:pointer-events-none disabled:opacity-35 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
