import { Check, ChevronLeft, Clock, FolderKanban, Minus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { GlassCard } from "@/components/dashboard/glass-card";
import { LocalDate } from "@/components/local-date";
import { SignRequest } from "@/components/documents/sign-request";
import {
  formatDocumentNumber,
  YES_NO_NA,
  type AnswerValue,
  type DocumentRequest,
  type DocumentSignature,
  type TemplateField,
} from "@/lib/documents";
import { personName, type Person } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import { getRequestsFrom, getSignatures, isOutstanding } from "@/lib/signatures";
import { getCurrentUser } from "@/lib/user";
import { cn } from "@/lib/utils";
import {
  getAllTemplates,
  getFileUrls,
  getSubmission,
  getTemplateVersion,
} from "@/lib/submissions";

const empty = <span className="text-muted-foreground">—</span>;

const isStringList = (v: AnswerValue | undefined): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

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
  requests,
  documentRequests,
  submissionId,
  currentUserId,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  jobLabel: { name: string; number: string } | null;
  fileUrls: Record<string, string>;
  personById: Map<string, Person>;
  requests: DocumentSignature[]; // this field's rows from document_signatures
  documentRequests: DocumentRequest[]; // documents this one asked people to complete
  submissionId: string;
  currentUserId: string | null;
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

    case "checkbox": {
      const asked = field.requestDocument
        ? documentRequests.filter((r) => r.template_id === field.requestDocument!.templateId)
        : [];
      if (value === true && asked.length > 0) {
        return (
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Yes · asked {asked.length}{" "}
              {asked.length === 1 ? "person" : "people"}
            </span>
            <div className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-white/60 dark:border-white/10">
              {asked.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5">
                  <PersonLine
                    person={r.requested_user_id ? personById.get(r.requested_user_id) : undefined}
                    fallback="Removed user"
                  />
                  {r.fulfilled_submission_id ? (
                    <Link
                      href={`/dashboard/documents/${r.fulfilled_submission_id}`}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300"
                    >
                      <Check className="h-3 w-3" /> Complete
                    </Link>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-800 dark:text-sky-300">
                      <Clock className="h-3 w-3" /> Requested
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }
      return value === true ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Minus className="h-4 w-4" /> No
        </span>
      );
    }

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

    case "person":
      return typeof value === "string" && value ? (
        <PersonLine person={personById.get(value)} />
      ) : (
        empty
      );

    case "datetime":
      return typeof value === "string" && value ? <LocalDate iso={value} withTime /> : empty;

    case "yes_no_na": {
      const option = YES_NO_NA.find((o) => o.value === value);
      if (!option) return empty;
      const tone =
        option.value === "yes"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : option.value === "no"
            ? "bg-red-500/15 text-red-700 dark:text-red-300"
            : "bg-slate-500/15 text-slate-700 dark:text-slate-300";
      return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
          {option.label}
        </span>
      );
    }

    case "completed_by":
      return typeof value === "string" && value ? (
        <PersonLine person={personById.get(value)} />
      ) : (
        empty
      );

    case "signatures": {
      // Signatures come only from document_signatures. (Old documents were moved
      // there by migration; `answers` can be edited by the submitter, so it is
      // never trusted as a source of signatures.)
      const rows = requests.map((r) => ({
        id: r.id,
        userId: r.user_id,
        path: r.signature_path,
        signedAt: r.signed_at,
      }));
      if (rows.length === 0) return empty;
      return (
        <div className="divide-y divide-foreground/10 overflow-hidden rounded-xl border border-white/60 dark:border-white/10">
          {rows.map((row) => {
            const url = row.path ? fileUrls[row.path] : undefined;
            const isMine = !row.path && !!currentUserId && row.userId === currentUserId;
            return (
              <div key={row.id} className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PersonLine
                    person={row.userId ? personById.get(row.userId) : undefined}
                    fallback={row.userId ? "Unknown" : "Removed user"}
                  />
                  {url ? (
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <div className="rounded-lg border border-white/70 bg-white p-1.5 dark:border-white/15">
                        {/* eslint-disable-next-line @next/next/no-img-element -- temporary signed link */}
                        <img src={url} alt="Signature" className="h-16 w-auto" />
                      </div>
                      {row.signedAt && (
                        <span className="text-xs text-muted-foreground">
                          Signed <LocalDate iso={row.signedAt} withTime />
                        </span>
                      )}
                    </div>
                  ) : row.path ? (
                    <span className="text-xs text-muted-foreground">Signature unavailable</span>
                  ) : !row.userId ? (
                    // Their account was deleted before they signed; no longer needed
                    <span className="text-xs text-muted-foreground">Not signed · account removed</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                      <Clock className="h-3 w-3" />
                      Waiting to sign
                    </span>
                  )}
                </div>
                {isMine && (
                  <SignRequest requestId={row.id} submissionId={submissionId} fieldId={field.id} />
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

  const [version, templates, projects, people, signatures, documentRequests, user] = await Promise.all([
    getTemplateVersion(submission.template_id, submission.template_version),
    getAllTemplates(),
    getProjects(),
    getPeople(),
    getSignatures(submission.id),
    getRequestsFrom(submission.id),
    getCurrentUser(),
  ]);
  const requestsFor = (fieldId: string) => signatures.filter((r) => r.field_id === fieldId);
  // Requests for deleted accounts can never be signed, so they don't count
  const counted = signatures.filter((r) => r.signed_at || r.user_id);
  const outstanding = signatures.filter(isOutstanding).length;

  const template = templates.find((t) => t.id === submission.template_id);
  const project = projects.find((p) => p.job_number === submission.job_number);
  const person = people.find((p) => p.user_id === submission.submitted_by);
  const answers = submission.answers;

  // Only show fields that were part of this document (skips hidden "Specify other" etc.),
  // and section headings that still have something under them
  const allFields = version?.fields ?? [];
  const isShown = (f: TemplateField) => f.type === "job" || f.id in answers;
  const fields = allFields.filter((f, i) => {
    if (f.type !== "section") return isShown(f);
    const next = allFields.slice(i + 1);
    const end = next.findIndex((x) => x.type === "section");
    return (end === -1 ? next : next.slice(0, end)).some(isShown);
  });

  // Split into groups: fields before the first section, then one per section
  const groups: { heading: TemplateField | null; items: TemplateField[] }[] = [];
  for (const f of fields) {
    if (f.type === "section") groups.push({ heading: f, items: [] });
    else if (groups.length === 0) groups.push({ heading: null, items: [f] });
    else groups[groups.length - 1].items.push(f);
  }

  // Signed links for any photos/signatures
  const filePaths = fields.flatMap((f): string[] => {
    const v = answers[f.id];
    if (f.type === "photos" && isStringList(v)) return v;
    if (f.type === "signature" && typeof v === "string") return [v];
    if (f.type === "signatures")
      return requestsFor(f.id)
        .map((r) => r.signature_path)
        .filter((p): p is string => !!p);
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
        {outstanding > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5" />
            Awaiting signatures · {counted.length - outstanding} of {counted.length}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Completed
          </span>
        )}
      </div>

      {/* Number, who and when */}
      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-white/60 bg-white/50 p-4 text-sm sm:grid-cols-3 dark:border-white/10 dark:bg-white/5">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Document no.
          </dt>
          <dd className="mt-1 font-semibold tabular-nums">
            {formatDocumentNumber(submission.document_number)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Submitted by
          </dt>
          <dd className="mt-1 flex items-center gap-2 font-medium">
            {person && <Avatar color={person.color} className="h-6 w-6" />}
            {person ? personName(person) : "Unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Submitted
          </dt>
          <dd className="mt-1 font-medium">
            <LocalDate iso={submission.submitted_at} withTime />
          </dd>
        </div>
      </dl>

      {/* The answers, in the form's order. Each section is its own list with
          its heading above it (a heading can't go inside a <dl>). */}
      <div className="mt-6 divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
        {groups.map((group, g) => (
          <section key={group.heading?.id ?? `group-${g}`} aria-label={group.heading?.label}>
            {group.heading && (
              <h2 className="bg-foreground/[0.03] px-4 py-3 text-sm font-semibold tracking-tight">
                {group.heading.label}
              </h2>
            )}
            {group.items.length > 0 && (
              <dl className={cn("divide-y divide-foreground/10", group.heading && "border-t border-foreground/10")}>
                {group.items.map((field) => (
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
                        requests={requestsFor(field.id)}
                        documentRequests={documentRequests}
                        submissionId={submission.id}
                        currentUserId={user?.id ?? null}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
        {fields.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">
            This document&apos;s form couldn&apos;t be loaded.
          </p>
        )}
      </div>
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
