import { Suspense } from "react";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import {
  NotificationBell,
  NotificationBellSkeleton,
  SidebarUser,
  SidebarUserSkeleton,
  TopBarUser,
} from "@/components/shell/shell-user";

// Wraps every screen under /dashboard with the sidebar and top bar.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
<<<<<<< Updated upstream
    <div className="relative min-h-svh">
      {/* Soft colored blobs behind everything. The glass cards blur these,
          which is what gives them the "liquid glass" look. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-sky-300/50 blur-3xl dark:bg-sky-600/25" />
        <div className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute -bottom-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-600/15" />
      </div>

      <Sidebar />
      {/* pl-16 leaves room for the collapsed sidebar. When it expands it
          slides over the content instead of pushing it around. */}
      <main className="pl-16">{children}</main>
    </div>
=======
    <DashboardShell
      user={
        <Suspense fallback={<SidebarUserSkeleton />}>
          <SidebarUser />
        </Suspense>
      }
      bell={
        <Suspense fallback={<NotificationBellSkeleton />}>
          <NotificationBell />
        </Suspense>
      }
      avatar={
        <Suspense>
          <TopBarUser />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
>>>>>>> Stashed changes
  );
}
