import { ChevronRight, FilePlus2, FileText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { GlassCard } from "@/components/dashboard/glass-card";
import { LocalDate } from "@/components/local-date";
import { personName } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import { getAllTemplates, getSubmissions, lookup } from "@/lib/submissions";

async function SubmissionList() {
  const [submissions, templates, projects, people] = await Promise.all([
    getSubmissions(),
    getAllTemplates(),
    getProjects(),
    getPeople(),
  ]);
  const templateById = lookup(templates, (t) => t.id);
  const projectByJob = lookup(projects, (p) => p.job_number);
  const personById = lookup(people, (p) => p.user_id);

  if (submissions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-foreground/15 p-6 text-center text-sm text-muted-foreground">
        No completed documents yet
      </p>
    );
  }

  return (
    <div className="divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
      {submissions.map((s) => {
        const template = templateById.get(s.template_id);
        const project = s.job_number ? projectByJob.get(s.job_number) : undefined;
        const person = s.submitted_by ? personById.get(s.submitted_by) : undefined;
        const title =
          typeof s.answers.title === "string" && s.answers.title
            ? s.answers.title
            : template?.name ?? "Document";

        return (
          <Link
            key={s.id}
            href={`/dashboard/documents/${s.id}`}
            className="group flex items-center gap-4 p-4 transition hover:bg-white/60 focus-visible:bg-white/60 focus-visible:outline-none dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-black/10">
              <FileText className="h-5 w-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{title}</span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-700 dark:text-sky-300">
                  {template?.name ?? "Unknown template"}
                </span>
                {s.job_number && (
                  <span className="truncate">
                    {project?.job_name ?? s.job_number} · {s.job_number}
                  </span>
                )}
              </span>
            </span>

            <span className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                {person && <Avatar color={person.color} className="h-5 w-5" />}
                <span className="max-w-[10rem] truncate">
                  {person ? personName(person) : "Unknown"}
                </span>
              </span>
              <LocalDate iso={s.submitted_at} />
            </span>

            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        );
      })}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-[4.5rem] animate-pulse rounded-2xl bg-foreground/5" />
      ))}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
      <GlassCard>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-1 text-sm text-muted-foreground">All completed documents, newest first.</p>
          </div>
          <Link
            href="/dashboard/documents/new"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-sky-600/20 transition hover:bg-sky-700"
          >
            <FilePlus2 className="h-4 w-4" />
            New
          </Link>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <SubmissionList />
        </Suspense>
      </GlassCard>
    </div>
  );
}
