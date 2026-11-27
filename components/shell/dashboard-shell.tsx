"use client";

import { Menu, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./sidebar-nav";
import { TopSearch, TopSearchFallback } from "./top-search";

// The frame around every dashboard screen:
//   left   sidebar (always open on wide screens; a slide-in drawer on phones)
//   top    search, notifications, the signed-in user
// `user`, `bell` and `avatar` are rendered on the server and passed in.
export function DashboardShell({
  user,
  bell,
  avatar,
  children,
}: {
  user: React.ReactNode; // sidebar footer: who's signed in
  bell: React.ReactNode; // top bar: notifications
  avatar: React.ReactNode; // top bar: the user's avatar
  children: React.ReactNode;
}) {
  // Phone drawer; closes when a link in it is clicked
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-svh bg-[rgb(var(--page-bg))]">
      {/* Dimmed backdrop behind the phone drawer */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full",
        )}
      >
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold leading-tight tracking-tight">
              Risky Business
            </span>
            <span className="block text-[0.65rem] leading-tight text-muted-foreground">
              Site Management and Safety Documentation
            </span>
          </span>
        </Link>
        <SidebarNav onNavigate={close} user={user} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Reads the URL, so it gets its own boundary (keeps the rest prerendered) */}
          <Suspense fallback={<TopSearchFallback />}>
            <TopSearch />
          </Suspense>
          <div className="ml-auto flex items-center gap-2">
            {bell}
            {avatar}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
