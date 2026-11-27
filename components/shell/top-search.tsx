"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { useSearchParams } from "next/navigation";

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-sky-400 focus:bg-card focus:ring-2 focus:ring-sky-500/30";

function SearchBox({ query }: { query: string }) {
  return (
    <Form action="/dashboard/documents" className="relative w-full max-w-md" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        // A new key when the URL's search changes, so the box shows the current search
        key={query}
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search documents"
        aria-label="Search documents"
        className={inputClass}
      />
    </Form>
  );
}

// Searches documents (by title, type, number or project): opens the Documents
// list filtered to the results.
export function TopSearch() {
  return <SearchBox query={useSearchParams().get("q") ?? ""} />;
}

// Same box, empty, while the URL is being read
export const TopSearchFallback = () => <SearchBox query="" />;
