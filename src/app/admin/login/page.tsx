import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { SuperboothLogo } from "@/components/brand/SuperboothLogo";
import { currentAdmin } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");

  return (
    <main className="@container flex min-h-dvh flex-col items-center justify-center gap-10 bg-ink-950 px-6">
      <div className="w-full max-w-xs">
        <SuperboothLogo subline="Backend" />
      </div>
      <LoginForm mode={firebaseConfigured() ? "firebase" : "pin"} />
    </main>
  );
}
