import { createClient } from "@/lib/supabase/server";
import type { Person } from "@/lib/person";

// Everyone's public profile (name, color, position), sorted by name.
// Used anywhere the app shows other people: crews, documents, etc.
export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, color, position")
    .order("first_name", { nullsFirst: false })
    .order("last_name", { nullsFirst: false });
  if (error) console.error("getPeople:", error.message);
  return ((data ?? []) as Omit<Person, "email">[]).map((p) => ({ ...p, email: null }));
}

// The uids on the signed-in user's crew.
export async function getCrewIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("crew_members")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getCrewIds:", error.message);
  return (data?.crew_members as string[] | null) ?? [];
}
