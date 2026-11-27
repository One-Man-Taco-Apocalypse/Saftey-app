import { Suspense } from "react";
import { AppsModule } from "@/components/dashboard/apps-module";
import { CrewModule, CrewModuleSkeleton } from "@/components/dashboard/crew-module";
import { DashboardStats, DashboardStatsSkeleton } from "@/components/dashboard/dashboard-stats";
import { ModuleGrid } from "@/components/dashboard/module-grid";
import { ProjectModule, ProjectModuleSkeleton } from "@/components/dashboard/project-module";
import { SignaturesModule, SignaturesModuleSkeleton } from "@/components/dashboard/signatures-module";

// Dashboard tab: My Overview
export default function DashboardPage() {
  return (
    <ModuleGrid>
      {/* Row of numbers */}
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>

      {/* What needs doing first, then the crew */}
      <Suspense fallback={<SignaturesModuleSkeleton />}>
        <SignaturesModule />
      </Suspense>
      <Suspense fallback={<CrewModuleSkeleton />}>
        <CrewModule />
      </Suspense>

      <Suspense fallback={<ProjectModuleSkeleton />}>
        <ProjectModule />
      </Suspense>
      <AppsModule />

      {/* Add more modules here, e.g.
          <Module size="small">...</Module>
          <Module size="medium">...</Module> */}
    </ModuleGrid>
  );
}
