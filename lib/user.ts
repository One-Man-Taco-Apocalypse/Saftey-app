import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
  color: string;
  firstName: string | null;
  lastName: string | null;
};

// Loads the signed-in user plus their profile (name + color).
// `cache` means several components can call this on the same page
// and it only hits the database once.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("color, first_name, last_name")
    .eq("user_id", claims.sub)
    .maybeSingle();

  // Shows up in the terminal running `npm run dev`
  if (error) {
    console.error("getCurrentUser: could not load profile:", error.message);
  } else if (!profile) {
    console.warn("getCurrentUser: no profile row for user", claims.sub);
  }

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    color: profile?.color ?? "#6b7280", // grey if they have no row yet
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
  };
});
