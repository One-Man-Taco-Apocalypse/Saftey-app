import { Bell } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { getMyDocumentRequests, getOutstandingSignatures } from "@/lib/signatures";
import { getCurrentUser } from "@/lib/user";

const displayName = (u: { firstName: string | null; lastName: string | null; email: string | null }) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown user";

// Sidebar footer: who's signed in.
export async function SidebarUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3">
      <Avatar color={user.color} className="h-9 w-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{displayName(user)}</p>
        {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
      </div>
    </div>
  );
}

export function SidebarUserSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

// Top bar: the user's avatar and first name.
export async function TopBarUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 border-l border-border pl-3">
      <Avatar color={user.color} className="h-8 w-8" />
      <span className="hidden text-sm font-medium sm:block">{user.firstName ?? displayName(user)}</span>
    </div>
  );
}

const iconButton =
  "relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground";

// Top bar: a bell with how many things are waiting on the user (signatures to
// add + documents requested from them). Opens the dashboard, which lists them.
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [signatures, requests] = await Promise.all([
    getOutstandingSignatures(user.id),
    getMyDocumentRequests(user.id),
  ]);
  const count = signatures.length + requests.length;
  return (
    <Link
      href="/dashboard#signatures"
      className={iconButton}
      aria-label={
        count ? `${count} ${count === 1 ? "item needs" : "items need"} your attention` : "Notifications"
      }
      title={count ? `${count} waiting on you` : "Nothing waiting on you"}
    >
      <Bell className="h-[1.125rem] w-[1.125rem]" />
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[0.65rem] font-bold text-white ring-2 ring-card">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function NotificationBellSkeleton() {
  return (
    <span className={iconButton} aria-hidden>
      <Bell className="h-[1.125rem] w-[1.125rem]" />
    </span>
  );
}
