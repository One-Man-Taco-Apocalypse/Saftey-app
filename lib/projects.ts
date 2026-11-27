import { cache } from "react";
import { getUserSettings } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import type { WorkforceRow } from "@/lib/workforce";

export type Project = { job_number: string; job_name: string };

// Every project, by job number. Loaded once per page.
export const getProjects = cache(async (): Promise<Project[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("job_number, job_name").order("job_number");
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

// --- Project details (Admin > Edit projects) ------------------------------------------

export type ProjectAddress = {
  street: string;
  unit: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: string; // decimal degrees as text ("" = not set), for editing
  longitude: string;
};

export type ProjectRole = {
  id: string;
  position: string;
  user_id: string | null; // null = nobody assigned yet
};

export type ProjectDetails = Project & { address: ProjectAddress; roles: ProjectRole[] };

// One project with its address and roles (in order), or null if it doesn't exist.
export const getProjectDetails = cache(async (jobNumber: string): Promise<ProjectDetails | null> => {
  const supabase = await createClient();
  const [project, roles] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "job_number, job_name, address_street, address_unit, address_city, address_province, address_postal_code, address_country, latitude, longitude",
      )
      .eq("job_number", jobNumber)
      .maybeSingle(),
    supabase
      .from("project_roles")
      .select("id, position, user_id")
      .eq("job_number", jobNumber)
      .order("sort_order"),
  ]);
  if (project.error) console.error("getProjectDetails:", project.error.message);
  if (roles.error) console.error("getProjectDetails (roles):", roles.error.message);
  const p = project.data;
  if (!p) return null;

  return {
    job_number: p.job_number,
    job_name: p.job_name,
    address: {
      street: p.address_street ?? "",
      unit: p.address_unit ?? "",
      city: p.address_city ?? "",
      province: p.address_province ?? "",
      postal_code: p.address_postal_code ?? "",
      country: p.address_country ?? "",
      latitude: p.latitude === null ? "" : String(p.latitude),
      longitude: p.longitude === null ? "" : String(p.longitude),
    },
    roles: (roles.data as ProjectRole[] | null) ?? [],
  };
});

// The foremen on a project and their crews (see migration 25 for who counts).
export const getProjectWorkforce = cache(async (jobNumber: string): Promise<WorkforceRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_workforce", { p_job_number: jobNumber });
  if (error) console.error("getProjectWorkforce:", error.message);
  return (data as WorkforceRow[] | null) ?? [];
});
