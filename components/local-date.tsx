"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// Shows a date/time in the viewer's own time zone (the server doesn't know it).
export function LocalDate({
  iso,
  withTime = false,
}: {
  iso: string;
  withTime?: boolean;
}) {
  const text = useSyncExternalStore(
    noop,
    () =>
      new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      }),
    () => iso.slice(0, 10), // on the server: plain YYYY-MM-DD
  );
  return <time dateTime={iso}>{text}</time>;
}
