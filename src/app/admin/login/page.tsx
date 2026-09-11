import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { SuperLogo } from "@/components/ds/booth";
import { currentAdmin } from "@/lib/auth";
import { firebaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-8)",
        padding: "var(--space-6)",
        background: "var(--surface-invert)",
        backgroundImage: "var(--texture-halftone)",
        backgroundSize: "var(--texture-halftone-size)",
      }}
    >
      <SuperLogo height="240px" subline="Backend" />
      <LoginForm mode={firebaseConfigured() ? "firebase" : "pin"} />
    </main>
  );
}
