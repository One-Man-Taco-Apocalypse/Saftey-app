"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// Shows a date/time in the viewer's own time zone (the server doesn't know it).
// `timeOnly` shows just the time, e.g. "2:05 PM".
export function LocalDate({
  iso,
  withTime = false,
  timeOnly = false,
}: {
  iso: string;
  withTime?: boolean;
  timeOnly?: boolean;
}) {
  const text = useSyncExternalStore(
    noop,
    () =>
      timeOnly
        ? new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        : new Date(iso).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
          }),
    // on the server: plain YYYY-MM-DD, or nothing for a time
    () => (timeOnly ? "" : iso.slice(0, 10)),
  );
  return <time dateTime={iso}>{text}</time>;
}
