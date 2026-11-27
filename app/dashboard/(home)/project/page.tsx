import { Suspense } from "react";
import { ModuleGrid } from "@/components/dashboard/module-grid";
import { AnnouncementsCard } from "@/components/project/announcements-card";
import { JobInfoCard, JobInfoCardSkeleton } from "@/components/project/job-info-card";
import { ProjectBanner, ProjectBannerSkeleton } from "@/components/project/project-banner";
import { WorkforceCard, WorkforceCardSkeleton } from "@/components/project/workforce-card";

// Dashboard tab: My project
//   banner (active project + change it) > job information > workforce > announcements
export default function MyProjectPage() {
  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={<ProjectBannerSkeleton />}>
        <ProjectBanner />
      </Suspense>
      <ModuleGrid>
        <Suspense fallback={<JobInfoCardSkeleton />}>
          <JobInfoCard />
        </Suspense>
        <Suspense fallback={<WorkforceCardSkeleton />}>
          <WorkforceCard />
        </Suspense>
        <AnnouncementsCard />
      </ModuleGrid>
    </div>
  );
}
