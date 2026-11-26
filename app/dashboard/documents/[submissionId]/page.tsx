import { Check, ChevronLeft, FolderKanban, Minus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { GlassCard } from "@/components/dashboard/glass-card";
import { LocalDate } from "@/components/local-date";
import type { AnswerValue, SignatureEntry, TemplateField } from "@/lib/documents";
import { personName, type Person } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import {
  getAllTemplates,
  getFileUrls,
  getSubmission,
  getTemplateVersion,
} from "@/lib/submissions";

const empty = <span className="text-muted-foreground">—</span>;

const isStringList = (v: AnswerValue | undefined): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isSignatureList = (v: AnswerValue | undefined): v is SignatureEntry[] =>
  Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null && "user_id" in x);

function PersonLine({ person, fallback }: { person?: Person; fallback?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar color={person?.color ?? "#6b7280"} className="h-8 w-8" />
      <div className="min-w-0">
        <p className="truncate font-medium">{person ? personName(person) : fallback ?? "Unknown"}</p>
        {person?.position && <p className="text-xs text-muted-foreground">{person.position}</p>}
      </div>
    </div>
  );
}

// Read-only display of one answer, based on the field's type.
function AnswerValueView({
  field,
  value,
  jobLabel,
  fileUrls,
  personById,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  jobLabel: { name: string; number: string } | null;
  fileUrls: Record<string, string>;
  personById: Map<string, Person>;
}) {
  switch (field.type) {
    case "job":
      return jobLabel ? (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <FolderKanban className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{jobLabel.name}</p>
            <p className="text-xs text-muted-foreground">{jobLabel.number}</p>
          </div>
        </div>
      ) : (
        empty
      );

    case "checkbox":
      return value === true ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Minus className="h-4 w-4" /> No
        </span>
      );

    case "photos": {
      const paths = isStringList(value) ? value : [];
      if (paths.length === 0) return empty;
      return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {paths.map((path) =>
            fileUrls[path] ? (
              <a
                key={path}
                href={fileUrls[path]}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-xl border border-white/60 transition hover:opacity-90 dark:border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- temporary signed link */}
                <img src={fileUrls[path]} alt="Photo" className="h-full w-full object-cover" />
              </a>
            ) : (
              <div
                key={path}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-foreground/15 text-xs text-muted-foreground"
              >
                Unavailable
              </div>
            ),
          )}
        </div>
      );
    }

    case "signature": {
      const url = typeof value === "string" ? fileUrls[value] : undefined;
      if (!url) return empty;
      return (
        <div className="inline-block rounded-xl border border-white/70 bg-white p-2 dark:border-white/15">
          {/* eslint-disable-next-line @next/next/no-img-element -- temporary signed link */}
          <img src={url} alt="Signature" className="h-28 w-auto" />
        </div>
      );
    }

    case "completed_by":
      return typeof value === "string" && value ? (
        <PersonLine person={personById.get(value)} />
      ) : (
        empty
      );

    case "signatures": {
      const entries = isSignatureList(value) ? value : [];
      if (entries.length === 0) return empty;
      return (
        <div className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-white/60 dark:border-white/10">
          {entries.map((entry, i) => {
            const url = entry.signature ? fileUrls[entry.signature] : undefined;
            return (
              <div
                key={`${entry.user_id}-${i}`}
                className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <PersonLine person={personById.get(entry.user_id)} />
                {url ? (
                  <div className="rounded-lg border border-white/70 bg-white p-1.5 dark:border-white/15">
                    {/* eslint-disable-next-line @next/next/no-img-element -- temporary signed link */}
                    <img src={url} alt="Signature" className="h-16 w-auto" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Not signed</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case "date":
      return typeof value === "string" && value ? (
        <LocalDate iso={`${value}T12:00:00`} />
      ) : (
        empty
      );

    default: {
      if (value === null || value === undefined || value === "") return empty;
      return <p className="whitespace-pre-wrap break-words">{String(value)}</p>;
    }
  }
}

async function CompletedDocument({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const submission = await getSubmission(submissionId);
  if (!submission) notFound();

  const [version, templates, projects, people] = await Promise.all([
    getTemplateVersion(submission.template_id, submission.template_version),
    getAllTemplates(),
    getProjects(),
    getPeople(),
  ]);

  const template = templates.find((t) => t.id === submission.template_id);
  const project = projects.find((p) => p.job_number === submission.job_number);
  const person = people.find((p) => p.user_id === submission.submitted_by);
  const answers = submission.answers;

  // Only show fields that were part of this document (skips hidden "Specify other" etc.)
  const fields = (version?.fields ?? []).filter(
    (f) => f.type === "job" || f.id in answers,
  );

  // Signed links for any photos/signatures
  const filePaths = fields.flatMap((f): string[] => {
    const v = answers[f.id];
    if (f.type === "photos" && isStringList(v)) return v;
    if (f.type === "signature" && typeof v === "string") return [v];
    if (f.type === "signatures" && isSignatureList(v))
      return v.map((e) => e.signature).filter((p): p is string => !!p);
    return [];
  });
  const personById = new Map(people.map((p) => [p.user_id, p]));
  const fileUrls = await getFileUrls(filePaths);

  const jobLabel = submission.job_number
    ? { name: project?.job_name ?? submission.job_number, number: submission.job_number }
    : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">
            {template?.name ?? "Document"}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {typeof answers.title === "string" && answers.title
              ? answers.title
              : template?.name ?? "Document"}
          </h1>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          Completed
        </span>
      </div>

      {/* Who and when */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {person && <Avatar color={person.color} className="h-6 w-6" />}
          {person ? personName(person) : "Unknown"}
        </span>
        <LocalDate iso={submission.submitted_at} withTime />
      </div>

      {/* The answers, in the form's order */}
      <dl className="mt-6 divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
        {fields.map((field) => (
          <div key={field.id} className="p-4">
            <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {field.label}
            </dt>
            <dd className="text-sm">
              <AnswerValueView
                field={field}
                value={answers[field.id]}
                jobLabel={jobLabel}
                fileUrls={fileUrls}
                personById={personById}
              />
            </dd>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            This document&apos;s form couldn&apos;t be loaded.
          </p>
        )}
      </dl>
    </>
  );
}

function DocumentSkeleton() {
  return (
    <div>
      <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
      <div className="mt-2 h-8 w-72 max-w-full animate-pulse rounded-full bg-foreground/10" />
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-foreground/5" />
    </div>
  );
}

export default function CompletedDocumentPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-8">
      <Link
        href="/dashboard/documents"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All documents
      </Link>
      <GlassCard>
        <Suspense fallback={<DocumentSkeleton />}>
          <CompletedDocument params={params} />
        </Suspense>
      </GlassCard>
    </div>
  );
}
