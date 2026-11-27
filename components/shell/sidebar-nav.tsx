"use client";

import {
  AlertTriangle,
  ClipboardCheck,
  FilePlus2,
  FileText,
  FolderCog,
  LayoutDashboard,
  MessagesSquare,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { SettingsButton } from "@/components/settings-button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; href?: string };

// Sidebar links. Items without an `href` aren't built yet and show "Soon".
const sections: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Documents", icon: FileText, href: "/dashboard/documents" },
      { label: "Create document", icon: FilePlus2, href: "/dashboard/documents/new" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Edit projects", icon: FolderCog, href: "/dashboard/admin/projects" },
      { label: "Toolbox talks", icon: MessagesSquare, href: "/dashboard/admin/toolbox-talks" },
    ],
  },
  {
    title: "Coming soon",
    items: [
      { label: "Inspections", icon: ClipboardCheck },
      { label: "Incidents", icon: AlertTriangle },
      { label: "Team", icon: Users },
    ],
  },
];

export const navItemClass =
  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

// The most specific link matching the current page is the active one
// (so "Create document" wins over "Documents" on /dashboard/documents/new).
function activeHref(pathname: string) {
  const hrefs = sections.flatMap((s) => s.items.flatMap((i) => (i.href ? [i.href] : [])));
  return hrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
}

// The links, with the current page highlighted (reads the URL)
function ActiveNavLinks({ onNavigate }: { onNavigate: () => void }) {
  return <NavLinks active={activeHref(usePathname())} onNavigate={onNavigate} />;
}

export function SidebarNav({ onNavigate, user }: { onNavigate: () => void; user: React.ReactNode }) {
  return (
    <>
      {/* Own boundary: on pages like /documents/[id] the URL isn't known while
          prerendering, so the links show un-highlighted until it is */}
      <Suspense fallback={<NavLinks active={undefined} onNavigate={onNavigate} />}>
        <ActiveNavLinks onNavigate={onNavigate} />
      </Suspense>

      <div className="border-t border-border p-3">
        <SettingsButton className={navItemClass} />
        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2.5">
          {user}
          <LogoutButton className="mt-2 w-full" />
        </div>
      </div>
    </>
  );
}

function NavLinks({ active, onNavigate }: { active: string | undefined; onNavigate: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="mb-1.5 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {section.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map(({ label, icon: Icon, href }) => (
              <li key={label}>
                {href ? (
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={href === active ? "page" : undefined}
                    className={cn(
                      navItemClass,
                      href === active &&
                        "bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 hover:text-sky-700 dark:text-sky-300 dark:hover:text-sky-300",
                    )}
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                    {label}
                  </Link>
                ) : (
                  <span
                    aria-disabled
                    className={cn(
                      navItemClass,
                      "cursor-default opacity-60 hover:bg-transparent hover:text-muted-foreground",
                    )}
                  >
                    <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                    {label}
                    <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase">
                      Soon
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
