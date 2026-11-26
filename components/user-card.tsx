import { Avatar } from "@/components/avatar";
import { getCurrentUser } from "@/lib/user";

// Shown while the user's info is loading: a grey circle.
export function UserCardSkeleton() {
  return (
    <div className="flex h-12 items-center">
      <div className="ml-1 h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

export async function UserCard() {
  const user = await getCurrentUser();
  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const displayName = fullName || user.email || "Unknown user";
  const color = user.color;

  return (
    <div className="flex h-12 items-center gap-3">
      <Avatar color={color} className="ml-1" />
      {/* Hidden while collapsed, fades in when the sidebar expands */}
      <span className="truncate text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        {displayName}
      </span>
    </div>
  );
}
