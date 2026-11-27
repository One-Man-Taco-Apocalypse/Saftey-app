import { redirect } from "next/navigation";
import { getProjectSettings, getProjects } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import { Module } from "./module-grid";
import { ProjectModuleClient } from "./project-module-client";

// Loads projects plus the user's favorites and current project on the server, then
// hands them to the interactive card.
export async function ProjectModule() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [projects, { favorites, current }] = await Promise.all([getProjects(), getProjectSettings(user.id)]);
  return (
    <ProjectModuleClient
      userId={user.id}
      projects={projects}
      initialFavorites={favorites}
      initialCurrent={current}
    />
  );
}

// Placeholder shown while projects load.
export function ProjectModuleSkeleton() {
  return (
    <Module size="medium">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1">
          <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
          <div className="mt-2 h-7 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-6 h-14 animate-pulse rounded-xl bg-muted/60" />
    </Module>
  );
}
