"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Re-loads the page's server data when documents change for the given people:
//   * their signature requests (asked to sign, or signed, on any device)
//   * with `includeSubmissions`, new documents they submit
//   * with `includeRequests`, documents they're asked to complete (and completing them)
// Tables must be in the supabase_realtime publication (see migrations).
// `refreshEveryMinutes` also re-loads on a timer, for time windows like
// "last 12 hours" that change without any database event.
export function SignatureRequestsLiveRefresh({
  userIds,
  channelName,
  includeSubmissions = false,
  includeRequests = false,
  refreshEveryMinutes,
}: {
  userIds: string[];
  channelName: string; // unique per card on the page
  includeSubmissions?: boolean;
  includeRequests?: boolean;
  refreshEveryMinutes?: number;
}) {
  const router = useRouter();
  const key = [...userIds].sort().join(","); // stable dependency

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const filterFor = (column: string) =>
      ids.length === 1 ? `${column}=eq.${ids[0]}` : `${column}=in.(${ids.join(",")})`;

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await supabase.realtime.setAuth(); // send the user's login so security rules apply
      if (cancelled) return;
      // Fresh name each time, so a quick remount never reuses a channel that's closing
      channel = supabase.channel(`${channelName}-${crypto.randomUUID()}`).on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_signatures", filter: filterFor("user_id") },
        () => router.refresh(),
      );
      if (includeSubmissions) {
        channel = channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "document_submissions", filter: filterFor("submitted_by") },
          () => router.refresh(),
        );
      }
      if (includeRequests) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "document_requests", filter: filterFor("requested_user_id") },
          () => router.refresh(),
        );
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [key, channelName, includeSubmissions, includeRequests, router]);

  useEffect(() => {
    if (!refreshEveryMinutes) return;
    const timer = setInterval(() => router.refresh(), refreshEveryMinutes * 60 * 1000);
    return () => clearInterval(timer);
  }, [refreshEveryMinutes, router]);

  return null;
}
