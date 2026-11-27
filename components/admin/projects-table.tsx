"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/lib/projects";

// Every project (job number + name), with a search box that filters as you type.
// Clicking a project opens its details (address, roles).
export function ProjectsTable({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const shown = query
    ? projects.filter((p) => `${p.job_number} ${p.job_name}`.toLowerCase().includes(query))
    : projects;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job number or name"
            aria-label="Search projects"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {query
            ? `${shown.length} of ${projects.length} ${projects.length === 1 ? "project" : "projects"}`
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {projects.length === 0 ? "No projects yet" : "No projects match your search"}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="w-40 px-4 py-2.5">
                  Job number
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Job name
                </th>
                <th scope="col" className="w-10 px-4 py-2.5">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.map((p) => (
                // The link covers the whole row (after:absolute inset-0), so any part opens it
                <tr key={p.job_number} className="group relative transition hover:bg-muted/60">
                  <td className="px-4 py-3 font-medium tabular-nums">
                    <Link
                      href={`/dashboard/admin/projects/${encodeURIComponent(p.job_number)}`}
                      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-sky-500"
                    >
                      {p.job_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.job_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
