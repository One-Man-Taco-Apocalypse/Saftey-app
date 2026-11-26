import { createClient } from "@/lib/supabase/server";
import type { DocumentTemplate, DocumentTemplateVersion } from "@/lib/documents";

// Every document template that can be filled in (not archived), A-Z.
export async function getTemplates(): Promise<DocumentTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("archived", false)
    .order("name");
  if (error) console.error("getTemplates:", error.message);
  return (data as DocumentTemplate[] | null) ?? [];
}

export async function getTemplate(id: string): Promise<DocumentTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getTemplate:", error.message);
  return (data as DocumentTemplate | null) ?? null;
}

// The newest version of a template (its current list of fields).
export async function getLatestVersion(
  templateId: string,
): Promise<DocumentTemplateVersion | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_template_versions")
    .select("*")
    .eq("template_id", templateId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("getLatestVersion:", error.message);
  return (data as DocumentTemplateVersion | null) ?? null;
}
