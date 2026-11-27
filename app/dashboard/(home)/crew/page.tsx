import { Suspense } from "react";
import { CrewModule, CrewModuleSkeleton } from "@/components/dashboard/crew-module";
import { ModuleGrid } from "@/components/dashboard/module-grid";

// Dashboard tab: My crew (the crew card, full width)
export default function MyCrewPage() {
  return (
    <ModuleGrid>
      <Suspense fallback={<CrewModuleSkeleton size="full" />}>
        <CrewModule size="full" />
      </Suspense>
    </ModuleGrid>
  );
}
