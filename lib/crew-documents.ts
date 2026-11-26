import { createClient } from "@/lib/supabase/server";

// THIS person's status on a document:
//   complete   they've signed (or it needed nothing from them)
//   waiting    they still need to sign
//   requested  they've been asked to complete this type of document, and haven't yet
export type CrewDocumentStatus = "complete" | "waiting" | "requested";

export type CrewDocument = {
  key: string; // unique per row
  href: string; // where the row links to
  documentNumber: number | null; // the document itself, or for a request, the one that asked
  templateId: string; // document type (for a request: the type asked for)
  title: string | null;
  at: string; // submitted at, or for a request, when it was asked
  status: CrewDocumentStatus;
  fromNumber?: number | null; // request only: number of the document that asked
};

const HOURS = 12;

// Per crew member (by user id):
//  * documents from the last 12 hours they're on: ones they were asked to sign,
//    plus ones they submitted
//  * documents they've been asked to complete and haven't yet (any age, until done)
// Grouping and sorting is up to the UI.
export async function getCrewDocuments(
  crewIds: string[],
): Promise<Record<string, CrewDocument[]>> {
  const result: Record<string, CrewDocument[]> = Object.fromEntries(crewIds.map((id) => [id, []]));
  if (crewIds.length === 0) return result;

  const supabase = await createClient();
  const since = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();

  const [docs, requests] = await Promise.all([
    // Every document submitted in the window, with its signature rows
    supabase
      .from("document_submissions")
      .select(
        "id, document_number, template_id, submitted_by, submitted_at, title:answers->>title, signatures:document_signatures(user_id, signed_at)",
      )
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false })
      .limit(1000),
    // The crew's open document requests, with the document that asked
    supabase
      .from("document_requests")
      .select(
        "id, template_id, requested_user_id, created_at, source:document_submissions!document_requests_source_fkey(id, document_number)",
      )
      .in("requested_user_id", crewIds)
      .is("fulfilled_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  if (docs.error) console.error("getCrewDocuments:", docs.error.message);
  if (requests.error) console.error("getCrewDocuments (requests):", requests.error.message);

  type DocRow = {
    id: string;
    document_number: number;
    template_id: string;
    submitted_by: string | null;
    submitted_at: string;
    title: string | null;
    signatures: { user_id: string | null; signed_at: string | null }[];
  };
  type RequestRow = {
    id: string;
    template_id: string;
    requested_user_id: string | null;
    created_at: string;
    source: { id: string; document_number: number } | null;
  };

  const crew = new Set(crewIds);
  for (const doc of (docs.data as DocRow[] | null) ?? []) {
    const statusByUser = new Map<string, CrewDocumentStatus>();
    for (const s of doc.signatures ?? []) {
      if (!s.user_id || !crew.has(s.user_id)) continue; // only the crew
      // If someone somehow has two rows, "waiting" wins until all are signed
      if (!s.signed_at) statusByUser.set(s.user_id, "waiting");
      else if (!statusByUser.has(s.user_id)) statusByUser.set(s.user_id, "complete");
    }
    // The submitter is on the document even if it had nothing for them to sign
    if (doc.submitted_by && crew.has(doc.submitted_by) && !statusByUser.has(doc.submitted_by)) {
      statusByUser.set(doc.submitted_by, "complete");
    }

    for (const [userId, status] of statusByUser) {
      result[userId]?.push({
        key: `doc-${doc.id}`,
        href: `/dashboard/documents/${doc.id}`,
        documentNumber: doc.document_number,
        templateId: doc.template_id,
        title: doc.title,
        at: doc.submitted_at,
        status,
      });
    }
  }

  for (const r of (requests.data as unknown as RequestRow[] | null) ?? []) {
    if (!r.requested_user_id) continue;
    result[r.requested_user_id]?.push({
      key: `request-${r.id}`,
      // The viewer is usually the foreman: show them the document that asked
      href: r.source ? `/dashboard/documents/${r.source.id}` : `/dashboard/documents/new/${r.template_id}`,
      documentNumber: null,
      templateId: r.template_id,
      title: null,
      at: r.created_at,
      status: "requested",
      fromNumber: r.source?.document_number ?? null,
    });
  }
  return result;
}
