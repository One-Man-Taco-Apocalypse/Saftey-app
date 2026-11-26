import { createClient } from "@/lib/supabase/client";

// Save changes to the signed-in user's user_settings row (browser side).
// Returns an error message, or null if it worked.
export async function saveUserSettings(
  userId: string,
  changes: Record<string, unknown>,
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select("user_id"); // returns the updated row, so we can tell if it worked

  if (error) {
    console.error("Could not save:", error.message);
    return `Couldn't save: ${error.message}`;
  }
  if (!data || data.length === 0) {
    return "Couldn't save: you have no row in user_settings yet.";
  }
  return null;
}
