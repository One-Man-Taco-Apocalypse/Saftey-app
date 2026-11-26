import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";

// The home page has no screen of its own. It just sends people where they belong:
// signed in -> dashboard, not signed in -> login.
async function RedirectByLogin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/dashboard");
  }
  redirect("/auth/login");
  return null;
}

export default function Home() {
  return (
    <Suspense>
      <RedirectByLogin />
    </Suspense>
  );
}
