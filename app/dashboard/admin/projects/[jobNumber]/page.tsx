import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectEditor } from "@/components/admin/project-editor";
import { Panel } from "@/components/dashboard/panel";
import { Breadcrumbs } from "@/components/page-header";
import { getPeople } from "@/lib/people";
import { getProjectDetails } from "@/lib/projects";
import { PageContainer } from "@/components/page-container";

type Params = Promise<{ jobNumber: string }>;

async function EditProject({ params }: { params: Params }) {
  const raw = (await params).jobNumber;
  let jobNumber = raw;
  try {
    jobNumber = decodeURIComponent(raw); // job numbers are URL-encoded in links
  } catch {
    // already decoded / not encoded: use as is
  }
  const [project, people] = await Promise.all([getProjectDetails(jobNumber), getPeople()]);
  if (!project) notFound();

  return (
    <>
      <div className="mb-6">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{project.job_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Job {project.job_number}</p>
      </div>
      <ProjectEditor project={project} people={people} />
    </>
  );
}

function EditorSkeleton() {
  return (
    <div>
      <div className="mb-6 h-8 w-64 animate-pulse rounded-full bg-muted" />
      <Panel className="mb-5 h-72 animate-pulse" />
      <Panel className="h-48 animate-pulse" />
    </div>
  );
}

export default function EditProjectPage({ params }: { params: Params }) {
  return (
    <PageContainer>
      <Breadcrumbs
        className="mb-2"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Edit projects", href: "/dashboard/admin/projects" },
          { label: "Project" },
        ]}
      />
      <Suspense fallback={<EditorSkeleton />}>
        <EditProject params={params} />
      </Suspense>
    </PageContainer>
  );
}
