import { cache } from "react";
import type { Person } from "@/lib/person";
import { getUserSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

// Everyone's public profile (name, color, position), sorted by name.
// Used anywhere the app shows other people: crews, documents, etc.
// Loaded once per page however many cards need it.
export const getPeople = cache(async (): Promise<Person[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, color, position")
    .order("first_name", { nullsFirst: false })
    .order("last_name", { nullsFirst: false });
  if (error) console.error("getPeople:", error.message);
  return ((data ?? []) as Omit<Person, "email">[]).map((p) => ({ ...p, email: null }));
});

// The uids on the signed-in user's crew.
export async function getCrewIds(userId: string): Promise<string[]> {
  return (await getUserSettings(userId)).crewMembers;
}
