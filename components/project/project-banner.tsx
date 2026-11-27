import { FolderKanban, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { getProjectDetails, getProjects, getProjectSettings } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import { ChangeProjectButton } from "./change-project-button";

const buttonClass =
  "inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-50";

// Banner at the top of "My project": the user's active project, and a button
// to change it.
export async function ProjectBanner() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [projects, { current, favorites }] = await Promise.all([getProjects(), getProjectSettings(user.id)]);
  const project = current ? await getProjectDetails(current) : null;
  const place = project ? [project.address.city, project.address.province].filter(Boolean).join(", ") : "";

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 p-6 text-white shadow-sm">
      {/* Soft decorative circles */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25">
            <FolderKanban className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/75">Active project</p>
            {project ? (
              <>
                <h2 className="truncate text-2xl font-semibold tracking-tight">{project.job_name}</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-white/80">
                  <span>Job {project.job_number}</span>
                  {place && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {place}
                    </span>
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold tracking-tight">No active project</h2>
                <p className="mt-0.5 text-sm text-white/80">Choose the project you&apos;re working on.</p>
              </>
            )}
          </div>
        </div>

        <ChangeProjectButton
          userId={user.id}
          projects={projects}
          favorites={favorites}
          current={project ? current : null}
          className={buttonClass}
        />
      </div>
    </div>
  );
}

export function ProjectBannerSkeleton() {
  return <div className="h-[6.5rem] animate-pulse rounded-xl bg-sky-600/40" />;
}
