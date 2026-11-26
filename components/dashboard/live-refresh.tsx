"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// Re-loads the page's server data when documents change for the given people:
//   * their signature requests (asked to sign, or signed, on any device)
//   * with `includeSubmissions`, new documents they submit
//   * with `includeRequests`, documents they're asked to complete (and completing them)
// Tables must be in the supabase_realtime publication (see migrations).
// `refreshEveryMinutes` also re-loads on a timer, for time windows like
// "last 12 hours" that change without any database event.
//
// One save can change many rows at once (a document with 10 signers inserts 10
// signature rows), so changes arriving close together cause ONE reload.
const BATCH_MS = 400;

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

  // Reload once, shortly after the last change in a burst
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), BATCH_MS);
  }, [router]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

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
        () => refreshSoon(),
      );
      if (includeSubmissions) {
        channel = channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "document_submissions", filter: filterFor("submitted_by") },
          () => refreshSoon(),
        );
      }
      if (includeRequests) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "document_requests", filter: filterFor("requested_user_id") },
          () => refreshSoon(),
        );
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [key, channelName, includeSubmissions, includeRequests, refreshSoon]);

  useEffect(() => {
    if (!refreshEveryMinutes) return;
    // Skipped while the tab is hidden; catches up as soon as it's shown again
    let stale = false;
    const tick = () => {
      if (document.hidden) stale = true;
      else router.refresh();
    };
    const onVisible = () => {
      if (!document.hidden && stale) {
        stale = false;
        router.refresh();
      }
    };
    const interval = setInterval(tick, refreshEveryMinutes * 60 * 1000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshEveryMinutes, router]);

  return null;
}
