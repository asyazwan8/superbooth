import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { SuperboothMark } from "@/components/brand/SuperboothLogo";
import { currentAdmin } from "@/lib/auth";
import { falMockEnabled, firebaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Events" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/gallery", label: "Gallery" },
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

  return (
    <div className="min-h-dvh bg-ink-950">
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <SuperboothMark className="h-7 w-7 text-accent" />
            <span className="font-display text-sm font-semibold tracking-[0.16em] text-ink-100">
              SUPERBOOTH
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-300 transition hover:bg-ink-850 hover:text-ink-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {falMockEnabled() ? <Badge tone="warn">Demo mode</Badge> : null}
            {!firebaseConfigured() ? <Badge tone="warn">Local storage</Badge> : null}
            <span className="hidden text-xs text-ink-500 sm:inline">{admin.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

function Badge({ tone, children }: { tone: "warn"; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest ${
        tone === "warn" ? "bg-warn/15 text-warn" : ""
      }`}
    >
      {children}
    </span>
  );
}
