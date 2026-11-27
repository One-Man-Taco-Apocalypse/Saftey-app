"use client";

import { Boxes, FolderKanban, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// The dashboard's tabs. Each is its own page, so tabs can be linked to.
const tabs: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "My Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My project", href: "/dashboard/project", icon: FolderKanban },
  { label: "My crew", href: "/dashboard/crew", icon: Users },
  { label: "My Assets", href: "/dashboard/assets", icon: Boxes },
];

export function DashboardTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="mb-6 border-b border-border">
      {/* Scrolls sideways on narrow phones instead of wrapping */}
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
