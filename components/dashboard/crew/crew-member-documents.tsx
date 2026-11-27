import Link from "next/link";
import { LocalDate } from "@/components/local-date";
import { StatusPill } from "@/components/status-pill";
import { groupByType, type CrewDocument } from "@/lib/crew-status";
import { formatDocumentNumber } from "@/lib/documents";

const statusLabel = {
  complete: "Complete",
  waiting: "Waiting signature",
  requested: "Requested",
} as const;

// One crew member's documents from the last 12 hours, grouped by document type,
// each with THAT person's status: Complete, Waiting signature, or Requested (asked
// to complete this type of document and not done yet).
export function CrewMemberDocuments({
  documents,
  templateNames,
}: {
  documents: CrewDocument[];
  templateNames: Record<string, string>;
}) {
  if (documents.length === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        No documents in the last 12 hours, and nothing requested
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {groupByType(documents, templateNames).map((group) => (
        <div key={group.name}>
          <p className="px-1 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.name}
          </p>
          <ul className="mt-0.5 flex flex-col">
            {group.docs.map((d) => (
              <li key={d.key}>
                <Link
                  href={d.href}
                  className="flex items-center gap-2 rounded-lg px-1 py-1 text-xs transition hover:bg-muted"
                >
                  {d.status === "requested" ? (
                    <span className="min-w-0 flex-1 truncate">
                      Not started
                      {d.fromNumber !== null && d.fromNumber !== undefined && (
                        <span className="ml-1 text-muted-foreground">
                          · asked on {formatDocumentNumber(d.fromNumber)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1 truncate">
                      <span className="mr-1 tabular-nums text-muted-foreground">
                        {formatDocumentNumber(d.documentNumber)}
                      </span>
                      {d.title || group.name}
                      <span className="ml-1 text-muted-foreground">
                        · <LocalDate iso={d.at} timeOnly />
                      </span>
                    </span>
                  )}
                  <StatusPill tone={d.status} size="sm">
                    {statusLabel[d.status]}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
