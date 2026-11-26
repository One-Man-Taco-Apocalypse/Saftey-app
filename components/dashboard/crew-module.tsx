import { redirect } from "next/navigation";
import { getCrewDocuments } from "@/lib/crew-documents";
import { getCrewIds, getPeople } from "@/lib/people";
import { getTemplateNames } from "@/lib/templates";
import { getCurrentUser } from "@/lib/user";
import { Module } from "./module-grid";
import { CrewModuleClient } from "./crew-module-client";

// Loads everyone + the user's crew + the crew's documents from the last 12 hours
// on the server, then hands them to the interactive card.
export async function CrewModule() {
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
      userId={user.id}
      people={people}
      initialCrew={crewIds}
      crewDocuments={crewDocuments}
      templateNames={templateNames}
    />
  );
}

// Placeholder shown while the crew loads.
export function CrewModuleSkeleton() {
  return (
    <Module size="medium">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="flex-1">
          <div className="h-4 w-16 animate-pulse rounded-full bg-foreground/10" />
          <div className="mt-2 h-7 w-28 animate-pulse rounded-full bg-foreground/10" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="h-14 animate-pulse rounded-2xl bg-foreground/5" />
        <div className="h-14 animate-pulse rounded-2xl bg-foreground/5" />
      </div>
    </Module>
  );
}
