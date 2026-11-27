import { FilePlus2, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { GreetingText, TodayText } from "@/components/dashboard/greeting";
import { primaryButtonClass, secondaryButtonClass } from "@/components/documents/styles";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/user";
import { cn } from "@/lib/utils";

async function Greeting() {
  const user = await getCurrentUser();
  return <GreetingText firstName={user?.firstName ?? null} />;
}

// Shared by the dashboard tabs (My Overview, My project, My crew, My Assets):
// the greeting, the main buttons and the tab bar. "(home)" doesn't appear in the URL.
export default function DashboardHomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <PageHeader
        title={
          <Suspense fallback={<span className="invisible">Good morning</span>}>
            <Greeting />
          </Suspense>
        }
        description={<TodayText />}
        actions={
          <>
            <Link href="/dashboard/documents" className={cn(secondaryButtonClass, "flex items-center gap-2")}>
              <FileText className="h-4 w-4" />
              All documents
            </Link>
            <Link
              href="/dashboard/documents/new"
              className={cn(primaryButtonClass, "flex items-center gap-2")}
            >
              <FilePlus2 className="h-4 w-4" />
              Create document
            </Link>
          </>
        }
      />
      <DashboardTabs />
      {children}
    </div>
  );
}
