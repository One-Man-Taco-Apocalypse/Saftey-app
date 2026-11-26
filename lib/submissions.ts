import { createClient } from "@/lib/supabase/server";
import type {
  DocumentSubmission,
  DocumentTemplate,
  DocumentTemplateVersion,
} from "@/lib/documents";
import { PHOTO_BUCKET } from "@/lib/documents";
import type { Person } from "@/lib/person";
import type { Project } from "@/lib/projects";

// Newest completed documents first. Limited for now; add paging later.
export async function getSubmissions(limit = 200): Promise<DocumentSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(
      "id, document_number, template_id, template_version, job_number, submitted_by, submitted_at, updated_at, answers",
    )
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getSubmissions:", error.message);
  return (data as DocumentSubmission[] | null) ?? [];
}

export async function getSubmission(id: string): Promise<DocumentSubmission | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(
      "id, document_number, template_id, template_version, job_number, submitted_by, submitted_at, updated_at, answers",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getSubmission:", error.message);
  return (data as DocumentSubmission | null) ?? null;
}

// All templates, including archived ones (old documents may use them).
export async function getAllTemplates(): Promise<DocumentTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("document_templates").select("*");
  if (error) console.error("getAllTemplates:", error.message);
  return (data as DocumentTemplate[] | null) ?? [];
}

// The exact version of the form a document was filled in on.
export async function getTemplateVersion(
  templateId: string,
  version: number,
): Promise<DocumentTemplateVersion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_template_versions")
    .select("*")
    .eq("template_id", templateId)
    .eq("version", version)
    .maybeSingle();
  if (error) console.error("getTemplateVersion:", error.message);
  return (data as DocumentTemplateVersion | null) ?? null;
}

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

export function lookup<T>(items: T[], key: (item: T) => string) {
  return new Map(items.map((item) => [key(item), item]));
}

export type { Person, Project };
