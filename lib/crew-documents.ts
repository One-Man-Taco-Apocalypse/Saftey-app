import {
  buildCrewDocuments,
  type CrewDocRow,
  type CrewDocument,
  type CrewRequestRow,
} from "@/lib/crew-status";
import { createClient } from "@/lib/supabase/server";

export type { CrewDocument, CrewDocumentStatus } from "@/lib/crew-status";

// How far back the Crew card looks for documents
export const CREW_WINDOW_HOURS = 12;

// Per crew member (by user id):
//  * documents from the last 12 hours they're on: ones they were asked to sign,
//    plus ones they submitted
//  * documents they've been asked to complete and haven't yet (any age, until done)
// The status logic is in crew-status.ts; grouping and sorting is up to the UI.
export async function getCrewDocuments(
  crewIds: string[],
): Promise<Record<string, CrewDocument[]>> {
  if (crewIds.length === 0) return {};

  const supabase = await createClient();
  const since = new Date(Date.now() - CREW_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

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

  return buildCrewDocuments(
    crewIds,
    (docs.data as CrewDocRow[] | null) ?? [],
    (requests.data as unknown as CrewRequestRow[] | null) ?? [],
  );
}
