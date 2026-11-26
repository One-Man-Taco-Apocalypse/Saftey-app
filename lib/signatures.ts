import { createClient } from "@/lib/supabase/server";
import type { DocumentRequest, DocumentSignature } from "@/lib/documents";

const COLUMNS =
  "id, submission_id, field_id, sort_order, user_id, requested_by, signature_path, signed_at, created_at";

// Every signature request on one document, in table order.
export async function getSignatures(submissionId: string): Promise<DocumentSignature[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_signatures")
    .select(COLUMNS)
    .eq("submission_id", submissionId)
    .order("field_id")
    .order("sort_order");
  if (error) console.error("getSignatures:", error.message);
  return (data as DocumentSignature[] | null) ?? [];
}

export type SignatureProgress = { signed: number; total: number };

// Signed / total per document, for status badges in lists. Counted in the
// database (one row per document), so it stays right however many signers there are.
// Documents with no requests aren't in the map.
export async function getSignatureProgress(
  submissionIds: string[],
): Promise<Map<string, SignatureProgress>> {
  const progress = new Map<string, SignatureProgress>();
  if (submissionIds.length === 0) return progress;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_signature_progress")
    .select("submission_id, signed, total")
    .in("submission_id", submissionIds);
  if (error) console.error("getSignatureProgress:", error.message);

  for (const row of data ?? []) {
    progress.set(row.submission_id, { signed: row.signed, total: row.total });
  }
  return progress;
}

// Still needs signing: not signed, and the person still has an account
// (a request for a deleted account can never be signed, so it doesn't count).
export function isOutstanding(r: DocumentSignature) {
  return !r.signed_at && !!r.user_id;
}

export type OutstandingSignature = {
  id: string;
  submission_id: string;
  created_at: string;
  requested_by: string | null;
  submission: {
    document_number: number;
    template_id: string;
    job_number: string | null;
    submitted_at: string;
    title: string | null;
  } | null;
};

// Documents waiting for this user's signature, newest request first.
export async function getOutstandingSignatures(userId: string): Promise<OutstandingSignature[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_signatures")
    .select(
      "id, submission_id, created_at, requested_by, submission:document_submissions(document_number, template_id, job_number, submitted_at, title:answers->>title)",
    )
    .eq("user_id", userId)
    .is("signed_at", null)
    .order("created_at", { ascending: false });
  if (error) console.error("getOutstandingSignatures:", error.message);
  return (data as unknown as OutstandingSignature[] | null) ?? [];
}

// A document is complete once every requested person has signed.
export function isAwaitingSignatures(p: SignatureProgress | undefined) {
  return !!p && p.signed < p.total;
}

export type MyDocumentRequest = {
  id: string;
  template_id: string;
  created_at: string;
  requested_by: string | null;
  source: { id: string; document_number: number } | null;
};

// Documents this user has been asked to complete and hasn't yet, newest first.
// Submitting that type of document completes them (see submit_document).
export async function getMyDocumentRequests(userId: string): Promise<MyDocumentRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select(
      "id, template_id, created_at, requested_by, source:document_submissions!document_requests_source_fkey(id, document_number)",
    )
    .eq("requested_user_id", userId)
    .is("fulfilled_at", null)
    .order("created_at", { ascending: false });
  if (error) console.error("getMyDocumentRequests:", error.message);
  return (data as unknown as MyDocumentRequest[] | null) ?? [];
}

// Requests a document made (e.g. the Harness Inspections a PSA asked for).
export async function getRequestsFrom(submissionId: string): Promise<DocumentRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select(
      "id, template_id, requested_user_id, requested_by, source_submission_id, fulfilled_submission_id, fulfilled_at, created_at",
    )
    .eq("source_submission_id", submissionId)
    .order("created_at");
  if (error) console.error("getRequestsFrom:", error.message);
  return (data as DocumentRequest[] | null) ?? [];
}
