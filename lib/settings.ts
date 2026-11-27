import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserSettings = {
  currentProject: string | null;
  favoriteProjects: string[];
  crewMembers: string[];
};

// The signed-in user's user_settings row, loaded once per page however many
// cards need it. (Saving happens in the browser: lib/save-settings.ts.)
export const getUserSettings = cache(async (userId: string): Promise<UserSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("current_project, favorite_projects, crew_members")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getUserSettings:", error.message);
  return {
    currentProject: (data?.current_project as string | null) ?? null,
    favoriteProjects: (data?.favorite_projects as string[] | null) ?? [],
    crewMembers: (data?.crew_members as string[] | null) ?? [],
  };
});
