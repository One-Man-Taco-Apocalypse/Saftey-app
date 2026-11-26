"use client";

import { useSyncExternalStore } from "react";

function partOfDay(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// Re-check the time every minute so the greeting changes if the tab stays open.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

// Runs in the browser so it uses the user's own clock and time zone,
// not the server's.
export function Greeting({ firstName }: { firstName: string | null }) {
  const now = useSyncExternalStore(
    subscribe,
    () => {
      const d = new Date();
      return `${partOfDay(d)}|${d.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}`;
    },
    () => null, // on the server we don't know the user's time yet
  );

  const [part, date] = now?.split("|") ?? ["morning", " "];

  return (
    // invisible until the browser fills in the real time, so it never flashes the wrong greeting
    <div className={now ? "animate-in fade-in duration-500" : "invisible"}>
      <p className="text-sm font-medium text-muted-foreground">{date}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
        Good {part}
        {firstName ? `, ${firstName}` : ""}
      </h1>
    </div>
  );
}
