"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/admin/ui";

export function SignOutButton() {
  const router = useRouter();

  const signOut = async () => {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <Button tone="ghost" onClick={signOut}>
      Sign out
    </Button>
  );
}
