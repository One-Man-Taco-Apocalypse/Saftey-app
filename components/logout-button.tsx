"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={cn(
        "flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-60",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      {busy ? "Signing out…" : "Log out"}
    </button>
  );
}
