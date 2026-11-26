// Works out each crew member's documents and their status on each one.
// Pure functions (no database), shared by server and browser, unit tested in
// crew-status.test.ts. The database side is in crew-documents.ts.

// THIS person's status on a document:
//   complete   they've signed (or it needed nothing from them)
//   waiting    they still need to sign
//   requested  they've been asked to complete this type of document, and haven't yet
export type CrewDocumentStatus = "complete" | "waiting" | "requested";

export type CrewDocument = {
  key: string; // unique per row
  href: string; // where the row links to
  documentNumber: number | null; // the document itself (null for a request)
  templateId: string; // document type (for a request: the type asked for)
  title: string | null;
  at: string; // submitted at, or for a request, when it was asked
  status: CrewDocumentStatus;
  fromNumber?: number | null; // request only: number of the document that asked
};

// A document submitted in the time window, with its signature rows
export type CrewDocRow = {
  id: string;
  document_number: number;
  template_id: string;
  submitted_by: string | null;
  submitted_at: string;
  title: string | null;
  signatures: { user_id: string | null; signed_at: string | null }[] | null;
};

// An open "please complete this document" request, with the document that asked
export type CrewRequestRow = {
  id: string;
  template_id: string;
  requested_user_id: string | null;
  created_at: string;
  source: { id: string; document_number: number } | null;
};

// Per crew member (by user id): the documents they're on, plus their open requests.
export function buildCrewDocuments(
  crewIds: string[],
  docs: CrewDocRow[],
  requests: CrewRequestRow[],
): Record<string, CrewDocument[]> {
  const result: Record<string, CrewDocument[]> = Object.fromEntries(crewIds.map((id) => [id, []]));
  const crew = new Set(crewIds);

  for (const doc of docs) {
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

  for (const r of requests) {
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

// Groups one person's documents by type name (A-Z). Within a type: requests
// first (still to do), then newest first.
export function groupByType(
  documents: CrewDocument[],
  templateNames: Record<string, string>,
): { name: string; docs: CrewDocument[] }[] {
  const typeName = (d: CrewDocument) => templateNames[d.templateId] ?? "Document";
  const sorted = [...documents].sort(
    (a, b) =>
      typeName(a).localeCompare(typeName(b)) ||
      Number(b.status === "requested") - Number(a.status === "requested") ||
      b.at.localeCompare(a.at),
  );
  const groups: { name: string; docs: CrewDocument[] }[] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (last?.name === typeName(d)) last.docs.push(d);
    else groups.push({ name: typeName(d), docs: [d] });
  }
  return groups;
}
