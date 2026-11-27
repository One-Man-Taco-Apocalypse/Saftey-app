import { redirect } from "next/navigation";
import { getCrewDocuments } from "@/lib/crew-documents";
import { getCrewIds, getPeople } from "@/lib/people";
import { getTemplateNames } from "@/lib/templates";
import { getCurrentUser } from "@/lib/user";
import { Module, type ModuleSize } from "./module-grid";
import { CrewModuleClient } from "./crew-module-client";

// Loads everyone + the user's crew + the crew's documents from the last 12 hours
// on the server, then hands them to the interactive card.
export async function CrewModule({ size = "medium" }: { size?: ModuleSize } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const crewIds = await getCrewIds(user.id);
  // The crew's documents load alongside everything else, not after it
  const [people, templateNames, crewDocuments] = await Promise.all([
    getPeople(),
    getTemplateNames(),
    getCrewDocuments(crewIds),
  ]);

  return (
    <CrewModuleClient
      size={size}
      userId={user.id}
      people={people}
      initialCrew={crewIds}
      crewDocuments={crewDocuments}
      templateNames={templateNames}
    />
  );
}

// Placeholder shown while the crew loads.
export function CrewModuleSkeleton({ size = "medium" }: { size?: ModuleSize } = {}) {
  return (
    <Module size={size}>
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
          <div className="mt-2 h-7 w-28 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-2">
        <div className="h-14 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-14 animate-pulse rounded-xl bg-muted/60" />
      </div>
    </Module>
  );
}
