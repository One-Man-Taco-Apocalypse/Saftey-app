import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/page-header";
import { getTemplates } from "@/lib/templates";
import { PageContainer } from "@/components/page-container";

async function TemplateList() {
  const templates = await getTemplates();

  if (templates.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No document templates yet
      </p>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/40">
      {templates.map((template) => (
        <Link
          key={template.id}
          href={`/dashboard/documents/new/${template.id}`}
          className="group flex items-center gap-4 p-4 transition hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-black/10">
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{template.name}</span>
            {template.description && (
              <span className="block truncate text-sm text-muted-foreground">{template.description}</span>
            )}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      ))}
    </div>
  );
}

function TemplateListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[4.5rem] animate-pulse rounded-xl bg-muted/60" />
      ))}
    </div>
  );
}

export default function CreateDocumentPage() {
  return (
    <PageContainer width="form">
      <PageHeader
        title="Create document"
        description="Choose a document to fill in."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Create document" }]}
      />
      <Panel>
        <Suspense fallback={<TemplateListSkeleton />}>
          <TemplateList />
        </Suspense>
      </Panel>
    </PageContainer>
  );
}
