"use client";

import { ChevronRight, FileText, MessagesSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ToolboxTalk } from "@/lib/toolbox-talks";
import { cn } from "@/lib/utils";

// Every toolbox talk, searchable and filterable by category. Clicking a talk
// opens it (PDF viewer + "Select toolbox talk").
export function TalkLibrary({ talks }: { talks: ToolboxTalk[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = [...new Set(talks.map((t) => t.category))].sort((a, b) => a.localeCompare(b));
  const query = search.trim().toLowerCase();
  const shown = talks.filter(
    (t) =>
      (!category || t.category === category) &&
      (!query || `${t.code ?? ""} ${t.title} ${t.category} ${t.summary ?? ""}`.toLowerCase().includes(query)),
  );

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition",
      active
        ? "border-sky-600 bg-sky-600 text-white"
        : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  if (talks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
        <MessagesSquare className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">No toolbox talks yet</p>
        <p className="text-sm text-muted-foreground">
          Add talks on{" "}
          <Link
            href="/dashboard/admin/toolbox-talks"
            className="font-medium text-sky-700 hover:underline dark:text-sky-300"
          >
            Admin › Toolbox talks
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search talks"
            aria-label="Search toolbox talks"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        {/* Categories; scrolls sideways on phones */}
        <div role="group" aria-label="Category" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            aria-pressed={!category}
            onClick={() => setCategory(null)}
            className={chip(!category)}
          >
            All ({talks.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
              className={chip(category === c)}
            >
              {c} ({talks.filter((t) => t.category === c).length})
            </button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {shown.length} {shown.length === 1 ? "talk" : "talks"}
      </p>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No talks match your search
        </p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3">
          {shown.map((t) => (
            <li key={t.id}>
              <Link
                href={`/dashboard/toolbox-talks/${t.id}`}
                className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-sky-400/50 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-muted-foreground">
                    {t.category}
                    {t.code && <span className="ml-1.5 tabular-nums">· {t.code}</span>}
                  </span>
                  <span className="mt-0.5 block font-semibold leading-snug">{t.title}</span>
                  {t.summary && (
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{t.summary}</span>
                  )}
                  {!t.pdf_path && (
                    <span className="mt-2 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      No PDF yet
                    </span>
                  )}
                </span>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
