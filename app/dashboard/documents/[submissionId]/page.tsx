import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avatar } from "@/components/avatar";
import { Panel } from "@/components/dashboard/panel";
import { Breadcrumbs } from "@/components/page-header";
import { AnswerView, type AnswerContext } from "@/components/documents/view/answer-view";
import { LocalDate } from "@/components/local-date";
import { StatusPill } from "@/components/status-pill";
import { documentTitle, formatDocumentNumber, type DocumentSignature } from "@/lib/documents";
import { fieldsOnDocument, fullWidthFieldIds, groupBySection, isStringList } from "@/lib/forms";
import { personName } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import { getRequestsFrom, getSignatures, isOutstanding } from "@/lib/signatures";
import { getFileUrls, getSubmission } from "@/lib/submissions";
import { getTemplate, getTemplateVersion } from "@/lib/templates";
import { getCurrentUser } from "@/lib/user";
import { cn, lookup } from "@/lib/utils";
import { PageContainer } from "@/components/page-container";

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{children}</dd>
    </div>
  );
}

async function CompletedDocument({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const submission = await getSubmission(submissionId);
  if (!submission) notFound();

  const [version, template, projects, people, signatures, documentRequests, user] = await Promise.all([
    getTemplateVersion(submission.template_id, submission.template_version),
    getTemplate(submission.template_id),
    getProjects(),
    getPeople(),
    getSignatures(submission.id),
    getRequestsFrom(submission.id),
    getCurrentUser(),
  ]);
  const answers = submission.answers;

  const signaturesByField = new Map<string, DocumentSignature[]>();
  for (const s of signatures) {
    signaturesByField.set(s.field_id, [...(signaturesByField.get(s.field_id) ?? []), s]);
  }
  const signaturesFor = (fieldId: string) => signaturesByField.get(fieldId) ?? [];
  // Requests for deleted accounts can never be signed, so they don't count
  const counted = signatures.filter((r) => r.signed_at || r.user_id).length;
  const outstanding = signatures.filter(isOutstanding).length;

  const fields = fieldsOnDocument(version?.fields ?? [], answers);

  // Temporary links for any photos/signatures
  const filePaths = fields.flatMap((f): string[] => {
    const v = answers[f.id];
    if (f.type === "photos" && isStringList(v)) return v;
    if (f.type === "signature" && typeof v === "string") return [v];
    if (f.type === "signatures") {
      return signaturesFor(f.id).flatMap((r) => (r.signature_path ? [r.signature_path] : []));
    }
    return [];
  });

  const project = projects.find((p) => p.job_number === submission.job_number);
  const personById = lookup(people, (p) => p.user_id);
  const submitter = submission.submitted_by ? personById.get(submission.submitted_by) : undefined;

  const ctx: AnswerContext = {
    submissionId: submission.id,
    currentUserId: user?.id ?? null,
    jobLabel: submission.job_number
      ? { name: project?.job_name ?? submission.job_number, number: submission.job_number }
      : null,
    fileUrls: await getFileUrls(filePaths),
    personById,
    signaturesFor,
    documentRequests,
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-300">{template?.name ?? "Document"}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
            {documentTitle(answers, template?.name)}
          </h1>
        </div>
        {outstanding > 0 ? (
          <StatusPill tone="waiting" size="lg">
            Awaiting signatures · {counted - outstanding} of {counted}
          </StatusPill>
        ) : (
          <StatusPill tone="complete" size="lg" icon={false}>
            Completed
          </StatusPill>
        )}
      </div>

      {/* Number, who and when */}
      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm sm:grid-cols-3">
        <MetaItem label="Document no.">
          <span className="font-semibold tabular-nums">
            {formatDocumentNumber(submission.document_number)}
          </span>
        </MetaItem>
        <MetaItem label="Submitted by">
          <span className="flex items-center gap-2">
            {submitter && <Avatar color={submitter.color} className="h-6 w-6" />}
            {submitter ? personName(submitter) : "Unknown"}
          </span>
        </MetaItem>
        <MetaItem label="Submitted">
          <LocalDate iso={submission.submitted_at} withTime />
        </MetaItem>
      </dl>

      {/* The answers, in the form's order. Each section is its own list with
          its heading above it (a heading can't go inside a <dl>). */}
      <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/40">
        {groupBySection(fields).map((group, g) => (
          <section key={group.heading?.id ?? `group-${g}`} aria-label={group.heading?.label}>
            {group.heading && (
              <h2 className="bg-foreground/[0.03] px-4 py-3 text-sm font-semibold tracking-tight">
                {group.heading.label}
              </h2>
            )}
            {group.items.length > 0 && (
              // Two columns on wide screens; gap-px over the border colour draws the lines
              <dl
                className={cn(
                  "grid grid-cols-1 gap-px bg-border lg:grid-cols-2",
                  group.heading && "border-t border-border",
                )}
              >
                {group.items.map((field) => (
                  <div
                    key={field.id}
                    className={cn(
                      "min-w-0 bg-card p-4",
                      fullWidthFieldIds(group.items).has(field.id) && "lg:col-span-2",
                    )}
                  >
                    <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="text-sm">
                      <AnswerView field={field} value={answers[field.id]} ctx={ctx} />
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
      <div className="h-4 w-32 animate-pulse rounded-full bg-muted" />
      <div className="mt-2 h-8 w-72 max-w-full animate-pulse rounded-full bg-muted" />
      <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}

export default function CompletedDocumentPage({ params }: { params: Promise<{ submissionId: string }> }) {
  return (
    <PageContainer width="form">
      <Breadcrumbs
        className="mb-3"
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Documents", href: "/dashboard/documents" },
          { label: "View document" },
        ]}
      />
      <Panel>
        <Suspense fallback={<DocumentSkeleton />}>
          <CompletedDocument params={params} />
        </Suspense>
      </Panel>
    </PageContainer>
  );
}
