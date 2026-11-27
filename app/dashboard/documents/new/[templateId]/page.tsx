import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Panel } from "@/components/dashboard/panel";
import { Breadcrumbs } from "@/components/page-header";
import { DocumentForm } from "@/components/documents/document-form";
import { getCrewIds, getPeople } from "@/lib/people";
import { getProjects, getProjectSettings } from "@/lib/projects";
import { getLatestVersion, getTemplate } from "@/lib/templates";
import { getToolboxTalks, toTalkOption } from "@/lib/toolbox-talks";
import { getCurrentUser } from "@/lib/user";
import { PageContainer } from "@/components/page-container";

type Props = {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ talk?: string | string[] }>; // ?talk=<id>: start with that toolbox talk
};

async function FillDocument({ params, searchParams }: Props) {
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

  // Toolbox talk forms: the talk library, and the talk picked on its page (if any)
  const talkField = version.fields.find((f) => f.type === "toolbox_talk");
  const talks = talkField ? (await getToolboxTalks()).map(toTalkOption) : [];
  const { talk } = await searchParams;
  const pickedTalk = typeof talk === "string" && talks.some((t) => t.id === talk) ? talk : null;
  const prefill = talkField && pickedTalk ? { [talkField.id]: pickedTalk } : {};

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
      {template.description && <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>}
      <div className="mt-6">
        <DocumentForm
          template={template}
          version={version}
          projects={projects}
          currentJob={settings.current}
          people={people}
          currentUserId={user.id}
          crewIds={crewIds}
          talks={talks}
          prefill={prefill}
        />
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <div>
      <div className="h-8 w-64 animate-pulse rounded-full bg-muted" />
      <div className="mt-8 flex flex-col gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
            <div className="mt-2 h-11 animate-pulse rounded-xl bg-muted/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FillDocumentPage({ params, searchParams }: Props) {
  return (
    <PageContainer width="form">
      <Breadcrumbs
        className="mb-3"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Create document", href: "/dashboard/documents/new" },
          { label: "Fill in" },
        ]}
      />
      <Panel>
        <Suspense fallback={<FormSkeleton />}>
          <FillDocument params={params} searchParams={searchParams} />
        </Suspense>
      </Panel>
    </PageContainer>
  );
}
