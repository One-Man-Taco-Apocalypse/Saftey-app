import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { UserCard, UserCardSkeleton } from "@/components/user-card";

// Sidebar buttons. Give an item an `href` to make it a link;
// items without one are placeholders for now.
const items: { label: string; icon: React.ComponentType<{ className?: string }>; href?: string }[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Documents", icon: FileText, href: "/dashboard/documents" },
  { label: "Inspections", icon: ClipboardCheck },
  { label: "Incidents", icon: AlertTriangle },
  { label: "Team", icon: Users },
];

function SidebarButton({
  label,
  icon: Icon,
  href,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const className =
    "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" />
      {/* Hidden while collapsed, fades in when the sidebar expands */}
      <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </>
  );

  return href ? (
    <Link href={href} title={label} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" title={label} className={className}>
      {content}
    </button>
  );
}

export function Sidebar() {
  return (
    // "group" lets the labels inside react when the whole sidebar is hovered.
    // w-16 = collapsed (icons only), hover:w-56 = expanded (icons + labels).
    <aside className="group fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden border-r border-white/60 bg-white/60 p-3 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/50 transition-[width] duration-200 ease-in-out hover:w-56 hover:shadow-lg focus-within:w-56">
      <div className="mb-6 flex h-10 items-center px-2">
        <span className="whitespace-nowrap text-lg font-bold">
          S<span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">afety Docs</span>
        </span>
      </div>

      <div className="mb-4 border-b pb-4">
        <Suspense fallback={<UserCardSkeleton />}>
          <UserCard />
        </Suspense>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <SidebarButton key={item.label} {...item} />
        ))}
      </nav>

      <SidebarButton label="Settings" icon={Settings} />
    </aside>
  );
}
