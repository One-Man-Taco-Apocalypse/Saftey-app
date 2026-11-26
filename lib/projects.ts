import { createClient } from "@/lib/supabase/server";

export type Project = { job_number: string; job_name: string };

export async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("job_number, job_name")
    .order("job_number");
  if (error) console.error("getProjects:", error.message);
  return data ?? [];
}

// The signed-in user's current project and favorites, from user_settings.
export async function getProjectSettings(userId: string): Promise<{
  current: string | null;
  favorites: string[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("current_project, favorite_projects")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) console.error("getProjectSettings:", error.message);
  return {
    current: (data?.current_project as string | null) ?? null,
    favorites: (data?.favorite_projects as string[] | null) ?? [],
  };
}
