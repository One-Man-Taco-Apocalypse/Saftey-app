import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { formatDocumentNumber } from "@/lib/documents";
import type { SubmitResult } from "@/lib/submit-document";
import { primaryButtonClass, secondaryButtonClass } from "../styles";

// Shown after a document is saved: its number, time, and who was asked to do what.
export function SubmittedScreen({ templateName, result }: { templateName: string; result: SubmitResult }) {
  const hasNumber = result.number !== null;
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CheckCircle2 className="h-14 w-14 text-emerald-500" />
      <h2 className="mt-4 text-xl font-semibold">Submitted</h2>
      <p className="mt-1 text-sm text-muted-foreground">Your {templateName} has been saved.</p>
      {(hasNumber || result.submittedAt) && (
        <p className="mt-2 text-sm">
          {hasNumber && (
            <span className="font-semibold tabular-nums">Document {formatDocumentNumber(result.number)}</span>
          )}
          {hasNumber && result.submittedAt && <span className="text-muted-foreground"> · </span>}
          {result.submittedAt && (
            <span className="text-muted-foreground">
              submitted <LocalDate iso={result.submittedAt} withTime />
            </span>
          )}
        </p>
      )}
      {result.awaiting > 0 && (
        <p className="mt-3 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-300">
          {result.awaiting} {result.awaiting === 1 ? "person has" : "people have"} been asked to sign
        </p>
      )}
      {result.requested > 0 && (
        <p className="mt-2 rounded-full bg-sky-500/15 px-3 py-1 text-sm font-medium text-sky-800 dark:text-sky-300">
          {result.requested} document {result.requested === 1 ? "request" : "requests"} sent
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className={secondaryButtonClass}>
          Back to dashboard
        </Link>
        <Link href={`/dashboard/documents/${result.id}`} className={secondaryButtonClass}>
          View document
        </Link>
        <Link href="/dashboard/documents/new" className={primaryButtonClass}>
          New document
        </Link>
      </div>
    </div>
  );
}
