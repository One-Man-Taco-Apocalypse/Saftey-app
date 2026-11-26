import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET, type DocumentSubmission } from "@/lib/documents";

const COLUMNS =
  "id, document_number, template_id, template_version, job_number, submitted_by, submitted_at, updated_at, answers";

// Newest completed documents first. Limited for now; add paging later.
export async function getSubmissions(limit = 200): Promise<DocumentSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(COLUMNS)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getSubmissions:", error.message);
  return (data as DocumentSubmission[] | null) ?? [];
}

export const getSubmission = cache(async (id: string): Promise<DocumentSubmission | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getSubmission:", error.message);
  return (data as DocumentSubmission | null) ?? null;
});

// Temporary links (1 hour) for viewing private photos/signatures.
export async function getFileUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, 60 * 60);
  if (error) console.error("getFileUrls:", error.message);
  return Object.fromEntries(
    (data ?? [])
      .filter((d) => d.signedUrl && d.path)
      .map((d) => [d.path as string, d.signedUrl as string]),
  );
}
