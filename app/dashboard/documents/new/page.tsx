import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { GlassCard } from "@/components/dashboard/glass-card";
import { getTemplates } from "@/lib/templates";

async function TemplateList() {
  const templates = await getTemplates();

  if (templates.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center text-sm text-muted-foreground">
        No document templates yet
      </p>
    );
  }

  return (
    <div className="divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
      {templates.map((template) => (
        <Link
          key={template.id}
          href={`/dashboard/documents/new/${template.id}`}
          className="group flex items-center gap-4 p-4 transition hover:bg-white/60 focus-visible:bg-white/60 focus-visible:outline-none dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-black/10">
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{template.name}</span>
            {template.description && (
              <span className="block truncate text-sm text-muted-foreground">
                {template.description}
              </span>
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
        <div key={i} className="h-[4.5rem] animate-pulse rounded-2xl bg-foreground/5" />
      ))}
    </div>
  );
}

export default function CreateDocumentPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <GlassCard>
        <h1 className="text-2xl font-semibold tracking-tight">Create document</h1>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">
          Choose a document to fill in.
        </p>
        <Suspense fallback={<TemplateListSkeleton />}>
          <TemplateList />
        </Suspense>
      </GlassCard>
    </div>
  );
}
