import { ChevronLeft, ExternalLink, FileWarning, PenLine, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Panel } from "@/components/dashboard/panel";
import { primaryButtonClass, secondaryButtonClass } from "@/components/documents/styles";
import { PageContainer } from "@/components/page-container";
import { Breadcrumbs } from "@/components/page-header";
import { getTalkPdfUrl, getToolboxTalk, TOOLBOX_TALK_TEMPLATE_ID } from "@/lib/toolbox-talks";
import { cn } from "@/lib/utils";

type Params = Promise<{ talkId: string }>;

// One talk: its PDF in a viewer, and "Select toolbox talk" at the bottom, which
// opens the Toolbox Talk form with this talk filled in, to collect signatures.
async function Talk({ params }: { params: Params }) {
  const { talkId } = await params;
  const talk = await getToolboxTalk(talkId);
  if (!talk) notFound();
  const pdfUrl = await getTalkPdfUrl(talk.pdf_path);
  const selectHref = `/dashboard/documents/new/${TOOLBOX_TALK_TEMPLATE_ID}?talk=${talk.id}`;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            {talk.category}
            {talk.code && <span className="ml-1.5 tabular-nums text-muted-foreground">· {talk.code}</span>}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{talk.title}</h1>
          {talk.summary && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{talk.summary}</p>}
          {talk.archived && (
            <p className="mt-2 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              Archived: no longer in the talk list
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/admin/toolbox-talks?edit=${talk.id}`}
          className={cn(secondaryButtonClass, "inline-flex shrink-0 items-center gap-1.5")}
        >
          <Pencil className="h-4 w-4" />
          Edit talk
        </Link>
      </div>

      <Panel className="p-3 sm:p-4">
        {pdfUrl ? (
          <>
            {/* Phones often can't show a PDF inside a page, so they get a button */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="md:hidden">Tap to open the talk.</span>
                <span className="hidden md:inline">Can&apos;t see the talk below? Open it in a new tab.</span>
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(secondaryButtonClass, "inline-flex items-center gap-1.5")}
              >
                Open PDF <ExternalLink className="h-4 w-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
            <iframe
              title={`${talk.title} (PDF)`}
              src={pdfUrl}
              className="hidden h-[75vh] min-h-[32rem] w-full rounded-lg border border-border bg-muted md:block"
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <FileWarning className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No PDF for this talk yet</p>
            <p className="text-sm text-muted-foreground">Add one on Admin › Toolbox talks.</p>
          </div>
        )}
      </Panel>

      {/* Bottom bar: pick this talk and collect signatures */}
      <div className="sticky bottom-4 z-10 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
        <Link
          href="/dashboard/toolbox-talks"
          className={cn(secondaryButtonClass, "inline-flex items-center gap-1.5")}
        >
          <ChevronLeft className="h-4 w-4" />
          All talks
        </Link>
        <Link
          href={selectHref}
          className={cn(primaryButtonClass, "inline-flex items-center gap-2 px-5 py-2.5")}
        >
          <PenLine className="h-4 w-4" />
          Select toolbox talk
        </Link>
      </div>
    </>
  );
}

function TalkSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
      <div className="mt-2 h-8 w-80 max-w-full animate-pulse rounded-full bg-muted" />
      <div className="mt-6 h-[60vh] animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}

export default function ToolboxTalkPage({ params }: { params: Params }) {
  return (
    <PageContainer width="form">
      <Breadcrumbs
        className="mb-2"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Toolbox talks", href: "/dashboard/toolbox-talks" },
          { label: "Talk" },
        ]}
      />
      <Suspense fallback={<TalkSkeleton />}>
        <Talk params={params} />
      </Suspense>
    </PageContainer>
  );
}
