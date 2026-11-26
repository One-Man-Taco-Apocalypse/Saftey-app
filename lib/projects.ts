import { cache } from "react";
import { getUserSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type Project = { job_number: string; job_name: string };

// Every project, by job number. Loaded once per page.
export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("job_number, job_name")
    .order("job_number");
  if (error) console.error("getProjects:", error.message);
  return data ?? [];
});

// The signed-in user's current project and favorites.
export async function getProjectSettings(userId: string): Promise<{
  current: string | null;
  favorites: string[];
}> {
  const settings = await getUserSettings(userId);
  return { current: settings.currentProject, favorites: settings.favoriteProjects };
}
