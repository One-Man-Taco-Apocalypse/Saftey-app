import { Briefcase, MapPin, Pencil, UserCog } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Module, ModuleHeader } from "@/components/dashboard/module-grid";
import { secondaryButtonClass } from "@/components/documents/styles";
import { personName } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjectDetails, getProjectSettings, type ProjectAddress } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import { cn, lookup } from "@/lib/utils";
import { ProjectMap } from "./project-map";

function addressLines(a: ProjectAddress) {
  return [
    [a.street, a.unit].filter(Boolean).join(", "),
    [a.city, a.province, a.postal_code].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean);
}

const sectionLabel =
  "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

// Job information for the active project: location (address + map) and the
// project team (roles). Edited on Admin > Edit projects.
export async function JobInfoCard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { current } = await getProjectSettings(user.id);
  const [project, people] = await Promise.all([current ? getProjectDetails(current) : null, getPeople()]);

  if (!project) {
    return (
      <Module size="full">
        <ModuleHeader title="Job information" icon={Briefcase} />
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Choose an active project above to see its location and team
        </p>
      </Module>
    );
  }

  const editHref = `/dashboard/admin/projects/${encodeURIComponent(project.job_number)}`;
  const lines = addressLines(project.address);
  const personById = lookup(people, (p) => p.user_id);

  return (
    <Module size="full">
      <ModuleHeader
        title="Job information"
        description={`${project.job_name} · Job ${project.job_number}`}
        icon={Briefcase}
        action={
          <Link href={editHref} className={cn(secondaryButtonClass, "flex items-center gap-1.5 px-3 py-1.5")}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left: location + team */}
        <div className="flex flex-col gap-6">
          <section>
            <h3 className={sectionLabel}>
              <MapPin className="h-3.5 w-3.5" />
              Location
            </h3>
            {lines.length ? (
              <address className="text-sm not-italic leading-relaxed">
                {lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-sm text-muted-foreground">No address yet</p>
            )}
            {project.address.latitude && (
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {project.address.latitude}, {project.address.longitude}
              </p>
            )}
          </section>

          <section>
            <h3 className={sectionLabel}>
              <UserCog className="h-3.5 w-3.5" />
              Project team
            </h3>
            {project.roles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team roles set yet</p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {project.roles.map((role) => {
                  const person = role.user_id ? personById.get(role.user_id) : undefined;
                  return (
                    <li key={role.id} className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar color={person?.color ?? "#d1d5db"} className="h-8 w-8" />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm font-medium",
                            !person && "text-muted-foreground",
                          )}
                        >
                          {person ? personName(person) : "Unassigned"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{role.position}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right: map */}
        <ProjectMap
          latitude={project.address.latitude}
          longitude={project.address.longitude}
          label={project.job_name}
          editHref={editHref}
        />
      </div>
    </Module>
  );
}

export function JobInfoCardSkeleton() {
  return (
    <Module size="full">
      <div className="h-6 w-44 animate-pulse rounded-full bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-56 animate-pulse rounded-xl bg-muted/60" />
      </div>
    </Module>
  );
}
