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
  );
}
