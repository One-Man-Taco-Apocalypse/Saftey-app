<<<<<<< Updated upstream
import { ChevronRight, Clock, FilePlus2, FileText } from "lucide-react";
=======
import { ChevronRight, FilePlus2, FileText, X } from "lucide-react";
>>>>>>> Stashed changes
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Panel } from "@/components/dashboard/panel";
import { ClearAllDocuments } from "@/components/documents/clear-all-documents";
import { primaryButtonClass } from "@/components/documents/styles";
import { LocalDate } from "@/components/local-date";
<<<<<<< Updated upstream
import { formatDocumentNumber } from "@/lib/documents";
=======
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { documentTitle, formatDocumentNumber } from "@/lib/documents";
>>>>>>> Stashed changes
import { personName } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import { getSignatureProgress, isAwaitingSignatures } from "@/lib/signatures";
<<<<<<< Updated upstream
import { getAllTemplates, getSubmissions, lookup } from "@/lib/submissions";
=======
import { getSubmissions } from "@/lib/submissions";
import { getAllTemplates } from "@/lib/templates";
import { cn, lookup } from "@/lib/utils";

type SearchParams = Promise<{ q?: string | string[] }>;

// Columns (wide screens): No. | Document | Project | Submitted by | Submitted | Status
const columns =
  "md:grid md:grid-cols-[4.5rem_minmax(0,2fr)_minmax(0,1.2fr)_minmax(0,1.2fr)_8.5rem_9.5rem_1.25rem] md:items-center md:gap-4";

async function SubmissionList({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
>>>>>>> Stashed changes

  const [submissions, templates, projects, people] = await Promise.all([
    getSubmissions(),
    getAllTemplates(),
    getProjects(),
    getPeople(),
  ]);
  const templateById = lookup(templates, (t) => t.id);
  const projectByJob = lookup(projects, (p) => p.job_number);
  const personById = lookup(people, (p) => p.user_id);

  const rows = submissions.map((s) => {
    const template = templateById.get(s.template_id);
    const project = s.job_number ? projectByJob.get(s.job_number) : undefined;
    const person = s.submitted_by ? personById.get(s.submitted_by) : undefined;
    return { s, template, project, person, title: documentTitle(s.answers, template?.name) };
  });

  // Search: title, type, number ("12" or "#12"), project name/number, submitter
  const needle = query.toLowerCase().replace(/^#(?=\d)/, "");
  const shown = needle
    ? rows.filter((r) =>
        [
          r.title,
          r.template?.name,
          String(r.s.document_number),
          r.s.job_number,
          r.project?.job_name,
          r.person && personName(r.person),
        ].some((v) => v?.toLowerCase().includes(needle)),
      )
    : rows;
  const progress = await getSignatureProgress(shown.map((r) => r.s.id));

  return (
<<<<<<< Updated upstream
    <div className="divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
      {submissions.map((s) => {
        const template = templateById.get(s.template_id);
        const project = s.job_number ? projectByJob.get(s.job_number) : undefined;
        const person = s.submitted_by ? personById.get(s.submitted_by) : undefined;
        const title =
          typeof s.answers.title === "string" && s.answers.title
            ? s.answers.title
            : template?.name ?? "Document";
=======
    <>
      {query && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {shown.length} {shown.length === 1 ? "result" : "results"} for
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 py-0.5 pl-2 pr-1 font-medium">
            {query}
            <Link
              href="/dashboard/documents"
              aria-label="Clear search"
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Link>
          </span>
        </div>
      )}
>>>>>>> Stashed changes

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {query ? "No documents match your search" : "No completed documents yet"}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {/* Column headings (wide screens) */}
          <div
            className={cn(
              columns,
              "hidden border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid",
            )}
          >
            <span>No.</span>
            <span>Document</span>
            <span>Project</span>
            <span>Submitted by</span>
            <span>Submitted</span>
            <span>Status</span>
            <span />
          </div>

<<<<<<< Updated upstream
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">
                <span className="mr-1.5 tabular-nums text-muted-foreground">
                  {formatDocumentNumber(s.document_number)}
                </span>
                {title}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                  {template?.name ?? "Unknown template"}
                </span>
                {isAwaitingSignatures(progress.get(s.id)) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-800 dark:text-amber-300">
                    <Clock className="h-3 w-3" />
                    Awaiting signatures {progress.get(s.id)!.signed}/{progress.get(s.id)!.total}
                  </span>
                )}
                {s.job_number && (
                  <span className="truncate">
                    {project?.job_name ?? s.job_number} · {s.job_number}
                  </span>
                )}
                {/* On phones the right-hand column is hidden, so show the time here */}
                <span className="sm:hidden">
                  <LocalDate iso={s.submitted_at} withTime />
                </span>
              </span>
            </span>
=======
          <ul className="divide-y divide-border">
            {shown.map(({ s, template, project, person, title }) => {
              const signing = progress.get(s.id);
              const awaiting = signing && isAwaitingSignatures(signing);
              return (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/documents/${s.id}`}
                    className={cn(
                      columns,
                      "group flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                    )}
                  >
                    <span className="hidden font-medium tabular-nums text-muted-foreground md:block">
                      {formatDocumentNumber(s.document_number)}
                    </span>
>>>>>>> Stashed changes

                    {/* Document: title + type. On phones this also carries the rest. */}
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <FileText className="h-[1.125rem] w-[1.125rem]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          <span className="mr-1.5 tabular-nums text-muted-foreground md:hidden">
                            {formatDocumentNumber(s.document_number)}
                          </span>
                          {title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {template?.name ?? "Unknown template"}
                          <span className="md:hidden">
                            {" · "}
                            <LocalDate iso={s.submitted_at} withTime />
                          </span>
                        </span>
                      </span>
                    </span>

                    <span className="hidden min-w-0 md:block">
                      {s.job_number ? (
                        <>
                          <span className="block truncate">{project?.job_name ?? s.job_number}</span>
                          <span className="block truncate text-xs text-muted-foreground">{s.job_number}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </span>

                    <span className="hidden min-w-0 items-center gap-2 md:flex">
                      {person && <Avatar color={person.color} className="h-6 w-6" />}
                      <span className="truncate">{person ? personName(person) : "Unknown"}</span>
                    </span>

                    <span className="hidden text-muted-foreground md:block">
                      <LocalDate iso={s.submitted_at} withTime />
                    </span>

                    <span className="shrink-0">
                      {awaiting ? (
                        <StatusPill tone="waiting" size="sm">
                          Signatures {signing.signed}/{signing.total}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="complete" size="sm">
                          Completed
                        </StatusPill>
                      )}
                    </span>

                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground md:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="h-10 border-b border-border bg-muted/50" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
      <PageHeader
        title="Documents"
        description="All completed documents, newest first."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Documents" }]}
        actions={
          <Link href="/dashboard/documents/new" className={cn(primaryButtonClass, "flex items-center gap-2")}>
            <FilePlus2 className="h-4 w-4" />
            Create document
          </Link>
        }
      />
      <Panel>
        <Suspense fallback={<ListSkeleton />}>
          <SubmissionList searchParams={searchParams} />
        </Suspense>

        {/* TEMPORARY: testing tool, remove later (see the component) */}
        <ClearAllDocuments />
      </Panel>
    </div>
  );
}
