import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { DocumentForm } from "@/components/documents/document-form";
import { getCrewIds, getPeople } from "@/lib/people";
import { getProjects, getProjectSettings } from "@/lib/projects";
import { getLatestVersion, getTemplate } from "@/lib/templates";
import { getCurrentUser } from "@/lib/user";

async function FillDocument({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [template, version, projects, settings, people, crewIds] = await Promise.all([
    getTemplate(templateId),
    getLatestVersion(templateId),
    getProjects(),
    getProjectSettings(user.id),
    getPeople(),
    getCrewIds(user.id),
  ]);
  if (!template || !version) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
      {template.description && (
        <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
      )}
      <div className="mt-6">
        <DocumentForm
          template={template}
          version={version}
          projects={projects}
          currentJob={settings.current}
          people={people}
          currentUserId={user.id}
          crewIds={crewIds}
        />
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div>
      <div className="h-8 w-64 animate-pulse rounded-full bg-foreground/10" />
      <div className="mt-8 flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 animate-pulse rounded-full bg-foreground/10" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-foreground/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FillDocumentPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <Link
        href="/dashboard/documents/new"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All documents
      </Link>
      <GlassCard>
        <Suspense fallback={<FormSkeleton />}>
          <FillDocument params={params} />
        </Suspense>
      </GlassCard>
    </div>
  );
}
