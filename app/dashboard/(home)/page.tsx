import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppsModule } from "@/components/dashboard/apps-module";
import { DashboardBoard } from "@/components/dashboard/board/dashboard-board";
import { CrewModule, CrewModuleSkeleton } from "@/components/dashboard/crew-module";
import { DashboardStats, DashboardStatsSkeleton } from "@/components/dashboard/dashboard-stats";
import { ProjectModule, ProjectModuleSkeleton } from "@/components/dashboard/project-module";
import { SignaturesModule, SignaturesModuleSkeleton } from "@/components/dashboard/signatures-module";
import { AnnouncementsCard } from "@/components/project/announcements-card";
import { JobInfoCard, JobInfoCardSkeleton } from "@/components/project/job-info-card";
import { WorkforceCard, WorkforceCardSkeleton } from "@/components/project/workforce-card";
import { parseLayout, type CardType } from "@/lib/dashboard-layout";
import { getUserSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/user";

const statsGrid = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-4 2xl:gap-6";

// What each dashboard card shows. (The list of cards, their names and allowed
// sizes is in lib/dashboard-layout.ts.)
const CARD_CONTENT: Record<CardType, () => React.ReactNode> = {
  stats: () => (
    <div className={statsGrid}>
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  ),
  signatures: () => (
    <Suspense fallback={<SignaturesModuleSkeleton />}>
      <SignaturesModule />
    </Suspense>
  ),
  crew: () => (
    <Suspense fallback={<CrewModuleSkeleton />}>
      <CrewModule />
    </Suspense>
  ),
  project: () => (
    <Suspense fallback={<ProjectModuleSkeleton />}>
      <ProjectModule />
    </Suspense>
  ),
  apps: () => <AppsModule />,
  jobInfo: () => (
    <Suspense fallback={<JobInfoCardSkeleton />}>
      <JobInfoCard />
    </Suspense>
  ),
  workforce: () => (
    <Suspense fallback={<WorkforceCardSkeleton />}>
      <WorkforceCard />
    </Suspense>
  ),
  announcements: () => <AnnouncementsCard />,
};

// Loads the user's saved layout, then renders only the cards on it.
async function Board() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { preferences } = await getUserSettings(user.id);
  const layout = parseLayout(preferences.dashboard);
  const cards = Object.fromEntries(layout.map((c) => [c.type, CARD_CONTENT[c.type]()]));

  return <DashboardBoard userId={user.id} preferences={preferences} initialLayout={layout} cards={cards} />;
}

function BoardSkeleton() {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
        <div className="h-28 animate-pulse rounded-xl bg-muted/60 md:col-span-2 xl:col-span-4" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/60 md:col-span-2" />
        <div className="h-64 animate-pulse rounded-xl bg-muted/60 md:col-span-2" />
      </div>
    </div>
  );
}

// Dashboard tab: My Overview (the user's own layout; "Edit dashboard" changes it)
export default function DashboardPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board />
    </Suspense>
  );
}
