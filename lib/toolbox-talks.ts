import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The toolbox talk library (see migration 26). Server-side reads.

export const TALK_BUCKET = "toolbox-talks";
// The "Toolbox Talk" form: picks a talk and collects attendee signatures
export const TOOLBOX_TALK_TEMPLATE_ID = "00000000-0000-0000-0000-00000000d0c5";

export type ToolboxTalk = {
  id: string;
  title: string;
  category: string;
  code: string | null;
  summary: string | null;
  pdf_path: string | null;
  archived: boolean;
  created_at: string;
};

// What the form's talk picker needs
export type TalkOption = Pick<ToolboxTalk, "id" | "title" | "category" | "code">;

const COLUMNS = "id, title, category, code, summary, pdf_path, archived, created_at";

// Every talk, by category then title. Archived ones only when asked for
// (old documents still need their names).
export const getToolboxTalks = cache(async (includeArchived = false): Promise<ToolboxTalk[]> => {
  const supabase = await createClient();
  let query = supabase.from("toolbox_talks").select(COLUMNS).order("category").order("title");
  if (!includeArchived) query = query.eq("archived", false);
  const { data, error } = await query;
  if (error) console.error("getToolboxTalks:", error.message);
  return (data as ToolboxTalk[] | null) ?? [];
});

export const getToolboxTalk = cache(async (id: string): Promise<ToolboxTalk | null> => {
  // Not a uuid: no such talk (and avoids a database error)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("toolbox_talks").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) console.error("getToolboxTalk:", error.message);
  return (data as ToolboxTalk | null) ?? null;
});

// A temporary link (1 hour) to view a talk's PDF, or null.
export async function getTalkPdfUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(TALK_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) console.error("getTalkPdfUrl:", error.message);
  return data?.signedUrl ?? null;
}

export const toTalkOption = ({ id, title, category, code }: ToolboxTalk): TalkOption => ({
  id,
  title,
  category,
  code,
});
