import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { NavBar } from "@/components/ds/dashboard";
import { currentAdmin } from "@/lib/auth";
import { falMockEnabled, firebaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const NAV = [
  { id: "events", href: "/admin", label: "Events" },
  { id: "sessions", href: "/admin/sessions", label: "Sessions" },
  { id: "analytics", href: "/admin/analytics", label: "Analytics" },
  { id: "gallery", href: "/gallery", label: "Gallery" },
];

/**
 * The admin shell.
 *
 * Auth is enforced in this layout rather than in middleware so the check runs
 * on the server with full access to the session cookie, and so no page can be
 * added under it that forgets to authenticate. /admin/login sits outside the
 * (dashboard) route group precisely so it is not caught by this guard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  // Mode flags are load-bearing rather than decorative: an operator needs to
  // know the booth is mocked, or that nothing is persisted, before they trust
  // a number on any screen under here.
  const badges = [
    falMockEnabled() ? "Demo mode" : null,
    firebaseConfigured() ? null : "Local storage",
  ].filter((badge): badge is string => badge !== null);

  return (
    // Two grounds, as everywhere in this system: ink for the shell, paper for
    // the panels and tables on it. Gold is kept for headings and the active nav
    // item, so an operator's eye lands on structure rather than decoration.
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--surface-stage)",
        color: "var(--text-invert)",
      }}
    >
      <NavBar
        items={NAV}
        email={admin.email}
        badges={badges}
        action={<SignOutButton />}
      />

      <main
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "var(--space-8) var(--space-6) var(--space-12)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
