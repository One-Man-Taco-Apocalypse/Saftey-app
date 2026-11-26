import { CheckCircle2, ChevronRight, PenLine, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocalDate } from "@/components/local-date";
import { formatDocumentNumber } from "@/lib/documents";
import { personName } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjects } from "@/lib/projects";
import { getMyDocumentRequests, getOutstandingSignatures } from "@/lib/signatures";
import { getAllTemplates } from "@/lib/templates";
import { lookup } from "@/lib/utils";
import { getCurrentUser } from "@/lib/user";
import { SignatureRequestsLiveRefresh } from "./live-refresh";
import { Module } from "./module-grid";

// Documents waiting for the signed-in user's signature. Updates live.
export async function SignaturesModule() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [requests, docRequests, templates, projects, people] = await Promise.all([
    getOutstandingSignatures(user.id),
    getMyDocumentRequests(user.id),
    getAllTemplates(),
    getProjects(),
    getPeople(),
  ]);
  const templateById = lookup(templates, (t) => t.id);
  const projectByJob = lookup(projects, (p) => p.job_number);
  const personById = lookup(people, (p) => p.user_id);

  return (
    <Module size="medium">
      <SignatureRequestsLiveRefresh
        userIds={[user.id]}
        channelName="my-signature-requests"
        includeRequests
      />

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <PenLine className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">Signatures needed</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">
            {requests.length} {requests.length === 1 ? "document" : "documents"}
          </p>
        </div>
      </div>

      {requests.length === 0 && docRequests.length === 0 ? (
        <p className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          You&apos;re all caught up
        </p>
      ) : requests.length === 0 ? (
        <p className="mt-5 text-center text-sm text-muted-foreground">No signatures needed</p>
      ) : (
        <div className="mt-5 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {requests.map((r) => {
            const template = r.submission ? templateById.get(r.submission.template_id) : undefined;
            const job = r.submission?.job_number;
            const project = job ? projectByJob.get(job) : undefined;
            const requester = r.requested_by ? personById.get(r.requested_by) : undefined;
            return (
              <Link
                key={r.id}
                href={`/dashboard/documents/${r.submission_id}#sign`}
                className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    <span className="mr-1.5 tabular-nums text-muted-foreground">
                      {formatDocumentNumber(r.submission?.document_number)}
                    </span>
                    {r.submission?.title || template?.name || "Document"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[
                      template?.name,
                      job && (project?.job_name ?? job),
                      requester && `from ${personName(requester)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  <LocalDate iso={r.created_at} />
                </span>
                <span className="shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white transition group-hover:bg-sky-700">
                  Sign
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Documents someone asked this user to complete */}
      {docRequests.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requested from you
          </p>
          <div className="flex flex-col gap-2">
            {docRequests.map((r) => {
              const requester = r.requested_by ? personById.get(r.requested_by) : undefined;
              return (
                <Link
                  key={r.id}
                  href={`/dashboard/documents/new/${r.template_id}`}
                  className="group flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 transition hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                    <Send className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {templateById.get(r.template_id)?.name ?? "Document"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        r.source && `asked on ${formatDocumentNumber(r.source.document_number)}`,
                        requester && `by ${personName(requester)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-sky-600 px-3 py-1 text-xs font-medium text-white transition group-hover:bg-sky-700">
                    Start
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </Module>
  );
}

// Placeholder shown while requests load.
export function SignaturesModuleSkeleton() {
  return (
    <Module size="medium">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 animate-pulse rounded-2xl bg-foreground/10" />
        <div className="flex-1">
          <div className="h-4 w-32 animate-pulse rounded-full bg-foreground/10" />
          <div className="mt-2 h-7 w-36 animate-pulse rounded-full bg-foreground/10" />
        </div>
      </div>
      <div className="mt-5 h-14 animate-pulse rounded-2xl bg-foreground/5" />
    </Module>
  );
}
