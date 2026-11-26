import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import { Module } from "./module-grid";
import { Greeting } from "./greeting";

export async function PersonCard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <Module size="full">
      <Greeting firstName={user.firstName} />
    </Module>
  );
}

// Placeholder shown while the user's info loads.
export function PersonCardSkeleton() {
  return (
    <Module size="full">
      <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
      <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded-full bg-foreground/10" />
    </Module>
  );
}
