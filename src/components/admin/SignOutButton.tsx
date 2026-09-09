"use client";

import { useRouter } from "next/navigation";

/**
 * Sign out. Styled here rather than through the shared admin Button because
 * it lives on the ink nav bar, where a paper-ground button would shout.
 */
export function SignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={signOut}
      className="sb-hover"
      style={{
        minHeight: "var(--tap-min-desk)",
        padding: "0 var(--space-3)",
        cursor: "pointer",
        background: "transparent",
        color: "var(--sb-pink)",
        border: "var(--border-hair) solid var(--sb-pink)",
        font: "var(--type-label)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
      }}
    >
      Sign out
    </button>
  );
}
