import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DocumentTemplate, DocumentTemplateVersion } from "@/lib/documents";

// Template (form) queries. Each is wrapped in `cache`, so several components
// on one page asking for the same thing only hit the database once.

// Every document template that can be filled in (not archived), A-Z.
export const getTemplates = cache(async (): Promise<DocumentTemplate[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("archived", false)
    .order("name");
  if (error) console.error("getTemplates:", error.message);
  return (data as DocumentTemplate[] | null) ?? [];
});

// All templates, including archived ones (old documents may use them).
export const getAllTemplates = cache(async (): Promise<DocumentTemplate[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("document_templates").select("*");
  if (error) console.error("getAllTemplates:", error.message);
  return (data as DocumentTemplate[] | null) ?? [];
});

// Template id -> name, for labels.
export async function getTemplateNames(): Promise<Record<string, string>> {
  const templates = await getAllTemplates();
  return Object.fromEntries(templates.map((t) => [t.id, t.name]));
}

export const getTemplate = cache(async (id: string): Promise<DocumentTemplate | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("getTemplate:", error.message);
  return (data as DocumentTemplate | null) ?? null;
});

// The newest version of a template (its current list of fields).
export const getLatestVersion = cache(
  async (templateId: string): Promise<DocumentTemplateVersion | null> => {
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
  },
);

// The exact version of the form a document was filled in on.
export const getTemplateVersion = cache(
  async (templateId: string, version: number): Promise<DocumentTemplateVersion | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("document_template_versions")
      .select("*")
      .eq("template_id", templateId)
      .eq("version", version)
      .maybeSingle();
    if (error) console.error("getTemplateVersion:", error.message);
    return (data as DocumentTemplateVersion | null) ?? null;
  },
);
