import { Check, FolderKanban, Minus } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { LocalDate } from "@/components/local-date";
import { StatusPill, statusPillClass } from "@/components/status-pill";
import {
  YES_NO_NA,
  type AnswerValue,
  type DocumentRequest,
  type DocumentSignature,
  type TemplateField,
} from "@/lib/documents";
import { isStringList } from "@/lib/forms";
import { personName, type Person } from "@/lib/person";
import { cn } from "@/lib/utils";
import { SignRequest } from "../sign-request";

const empty = <span className="text-muted-foreground">—</span>;

// Everything about the document that answers may need (same for every field)
export type AnswerContext = {
  submissionId: string;
  currentUserId: string | null;
  jobLabel: { name: string; number: string } | null;
  fileUrls: Record<string, string>; // storage path -> temporary link
  personById: Map<string, Person>;
  signaturesFor: (fieldId: string) => DocumentSignature[]; // rows from document_signatures
  documentRequests: DocumentRequest[]; // documents this one asked people to complete
};

export function PersonLine({ person, fallback }: { person?: Person; fallback?: string }) {
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

function SignedImage({ url, className }: { url: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- temporary signed link
  return <img src={url} alt="Signature" className={className} />;
}

const yesNoTone = {
  yes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  no: "bg-red-500/15 text-red-700 dark:text-red-300",
  na: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
} as const;

// Read-only display of one answer, based on the field's type.
export function AnswerView({
  field,
  value,
  ctx,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  ctx: AnswerContext;
}) {
  switch (field.type) {
    case "job":
      return ctx.jobLabel ? (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <FolderKanban className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{ctx.jobLabel.name}</p>
            <p className="text-xs text-muted-foreground">{ctx.jobLabel.number}</p>
          </div>
        </div>
      ) : (
        empty
      );

    case "checkbox":
      return <CheckboxAnswer field={field} value={value} ctx={ctx} />;

    case "photos": {
      const paths = isStringList(value) ? value : [];
      if (paths.length === 0) return empty;
      return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {paths.map((path) =>
            ctx.fileUrls[path] ? (
              <a
                key={path}
                href={ctx.fileUrls[path]}
                target="_blank"
                rel="noreferrer"
                className="block aspect-square overflow-hidden rounded-xl border border-border transition hover:opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- temporary signed link */}
                <img src={ctx.fileUrls[path]} alt="Photo" className="h-full w-full object-cover" />
              </a>
            ) : (
              <div
                key={path}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground"
              >
                Unavailable
              </div>
            ),
          )}
        </div>
      );
    }

    case "signature": {
      const url = typeof value === "string" ? ctx.fileUrls[value] : undefined;
      if (!url) return empty;
      return (
        <div className="inline-block rounded-xl border border-border bg-white p-2">
          <SignedImage url={url} className="h-28 w-auto" />
        </div>
      );
    }

    case "person":
    case "completed_by":
      return typeof value === "string" && value ? <PersonLine person={ctx.personById.get(value)} /> : empty;

    case "datetime":
      return typeof value === "string" && value ? <LocalDate iso={value} withTime /> : empty;

    case "yes_no_na": {
      const option = YES_NO_NA.find((o) => o.value === value);
      if (!option) return empty;
      return (
        <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", yesNoTone[option.value])}>
          {option.label}
        </span>
      );
    }

    case "signatures":
      return <SignaturesAnswer field={field} ctx={ctx} />;

    case "date":
      return typeof value === "string" && value ? <LocalDate iso={`${value}T12:00:00`} /> : empty;

    default:
      if (value === null || value === undefined || value === "") return empty;
      return <p className="whitespace-pre-wrap break-words">{String(value)}</p>;
  }
}

// Yes / No, plus who was asked to complete a document because of it
function CheckboxAnswer({
  field,
  value,
  ctx,
}: {
  field: TemplateField;
  value: AnswerValue | undefined;
  ctx: AnswerContext;
}) {
  const asked = field.requestDocument
    ? ctx.documentRequests.filter((r) => r.template_id === field.requestDocument!.templateId)
    : [];

  if (value !== true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Minus className="h-4 w-4" /> No
      </span>
    );
  }
  if (asked.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
        <Check className="h-4 w-4" /> Yes
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
        <Check className="h-4 w-4" /> Yes · asked {asked.length} {asked.length === 1 ? "person" : "people"}
      </span>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {asked.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-2.5">
            <PersonLine
              person={r.requested_user_id ? ctx.personById.get(r.requested_user_id) : undefined}
              fallback="Removed user"
            />
            {r.fulfilled_submission_id ? (
              <Link
                href={`/dashboard/documents/${r.fulfilled_submission_id}`}
                className={cn(statusPillClass("complete"), "gap-1 hover:bg-emerald-500/25")}
              >
                <Check className="h-3 w-3" /> Complete
              </Link>
            ) : (
              <StatusPill tone="requested">Requested</StatusPill>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Signatures come only from document_signatures. (Old documents were moved
// there by migration; `answers` can be edited by the submitter, so it is
// never trusted as a source of signatures.)
function SignaturesAnswer({ field, ctx }: { field: TemplateField; ctx: AnswerContext }) {
  const rows = ctx.signaturesFor(field.id);
  if (rows.length === 0) return empty;

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {rows.map((row) => {
        const url = row.signature_path ? ctx.fileUrls[row.signature_path] : undefined;
        const isMine = !row.signature_path && !!ctx.currentUserId && row.user_id === ctx.currentUserId;
        return (
          <div key={row.id} className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PersonLine
                person={row.user_id ? ctx.personById.get(row.user_id) : undefined}
                fallback={row.user_id ? "Unknown" : "Removed user"}
              />
              {url ? (
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <div className="rounded-lg border border-border bg-white p-1.5">
                    <SignedImage url={url} className="h-16 w-auto" />
                  </div>
                  {row.signed_at && (
                    <span className="text-xs text-muted-foreground">
                      Signed <LocalDate iso={row.signed_at} withTime />
                    </span>
                  )}
                </div>
              ) : row.signature_path ? (
                <span className="text-xs text-muted-foreground">Signature unavailable</span>
              ) : !row.user_id ? (
                // Their account was deleted before they signed; no longer needed
                <span className="text-xs text-muted-foreground">Not signed · account removed</span>
              ) : (
                <StatusPill tone="waiting">Waiting to sign</StatusPill>
              )}
            </div>
            {isMine && <SignRequest requestId={row.id} submissionId={ctx.submissionId} fieldId={field.id} />}
          </div>
        );
      })}
    </div>
  );
}
