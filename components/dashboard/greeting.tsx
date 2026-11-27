"use client";

import { useSyncExternalStore } from "react";

function partOfDay(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// Re-check the time every minute so it changes if the tab stays open.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

// Read in the browser so it uses the user's own clock and time zone, not the
// server's. Null on the server.
function useNow() {
  return useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date();
      return `${partOfDay(d)}|${d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}`;
    },
    () => null,
  );
}

// "Good morning, Pat 👋". Invisible until the browser knows the time, so it
// never flashes the wrong greeting.
export function GreetingText({ firstName }: { firstName: string | null }) {
  const now = useNow();
  const part = now?.split("|")[0] ?? "morning";
  return (
    <span className={now ? "animate-in fade-in duration-500" : "invisible"}>
      Good {part}
      {firstName ? `, ${firstName}` : ""} <span aria-hidden>👋</span>
    </span>
  );
}

// "Thursday, November 26"
export function TodayText() {
  const now = useNow();
  return <span className={now ? "" : "invisible"}>{now?.split("|")[1] ?? "Today"}</span>;
}
