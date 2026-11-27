import { Suspense } from "react";
import { ProjectsTable } from "@/components/admin/projects-table";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/page-header";
import { getProjects } from "@/lib/projects";

async function Projects() {
  return <ProjectsTable projects={await getProjects()} />;
}

function ProjectsSkeleton() {
  return (
    <div>
      <div className="mb-4 h-10 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-10 border-b border-border bg-muted/50" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-6 border-b border-border px-4 py-3 last:border-0">
            <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Admin: the project list. Click a project to set its address and roles.
export default function EditProjectsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Edit projects"
        description="Choose a project to set its address and roles."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin" },
          { label: "Edit projects" },
        ]}
      />
      <Panel>
        <Suspense fallback={<ProjectsSkeleton />}>
          <Projects />
        </Suspense>
      </Panel>
    </div>
  );
}
