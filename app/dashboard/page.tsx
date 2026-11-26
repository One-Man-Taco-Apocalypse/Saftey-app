import { Suspense } from "react";
import { ModuleGrid } from "@/components/dashboard/module-grid";
import { AppsModule } from "@/components/dashboard/apps-module";
import {
  PersonCard,
  PersonCardSkeleton,
} from "@/components/dashboard/person-card";
import {
  ProjectModule,
  ProjectModuleSkeleton,
} from "@/components/dashboard/project-module";
import {
  CrewModule,
  CrewModuleSkeleton,
} from "@/components/dashboard/crew-module";

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <ModuleGrid>
        <Suspense fallback={<PersonCardSkeleton />}>
          <PersonCard />
        </Suspense>

        <AppsModule />

        <Suspense fallback={<ProjectModuleSkeleton />}>
          <ProjectModule />
        </Suspense>
        <Suspense fallback={<CrewModuleSkeleton />}>
          <CrewModule />
        </Suspense>

        {/* Add more modules here, e.g.
            <Module size="small">...</Module>
            <Module size="medium">...</Module> */}
      </ModuleGrid>
    </div>
  );
}
