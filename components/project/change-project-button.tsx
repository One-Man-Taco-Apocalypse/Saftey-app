"use client";

import { Check, Loader2, Repeat, Search, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PopupDialog } from "@/components/dashboard/popup";
import type { Project } from "@/lib/projects";
import { saveUserSettings } from "@/lib/save-settings";
import { cn } from "@/lib/utils";

// "Change project" button + popup: search every project (favorites first) and
// pick one to make it your active project.
export function ChangeProjectButton({
  userId,
  projects,
  favorites,
  current,
  className,
}: {
  userId: string;
  projects: Project[];
  favorites: string[];
  current: string | null;
  className?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const isFavorite = (p: Project) => favorites.includes(p.job_number);
  const shown = projects
    .filter((p) => !query || `${p.job_number} ${p.job_name}`.toLowerCase().includes(query))
    .sort((a, b) => Number(isFavorite(b)) - Number(isFavorite(a)));

  async function choose(jobNumber: string) {
    if (jobNumber === current) {
      dialogRef.current?.close();
      return;
    }
    setSaving(jobNumber);
    setError(null);
    const err = await saveUserSettings(userId, { current_project: jobNumber });
    setSaving(null);
    if (err) {
      setError(err);
      return;
    }
    dialogRef.current?.close();
    setSearch("");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={className}>
        <Repeat className="h-4 w-4" />
        {current ? "Change project" : "Choose a project"}
      </button>

      <PopupDialog dialogRef={dialogRef} title="Choose your active project">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job number or name"
            aria-label="Search projects"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-border">
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {projects.length === 0 ? "No projects yet" : "No projects match your search"}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {shown.map((p) => {
                const active = p.job_number === current;
                return (
                  <li key={p.job_number}>
                    <button
                      type="button"
                      onClick={() => choose(p.job_number)}
                      disabled={saving !== null}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted disabled:opacity-70",
                        active && "bg-sky-500/10",
                      )}
                    >
                      {isFavorite(p) ? (
                        <Star
                          className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400"
                          aria-label="Favorite"
                        />
                      ) : (
                        <span className="h-4 w-4 shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.job_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.job_number}</span>
                      </span>
                      {saving === p.job_number ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        active && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                            <Check className="h-3 w-3" /> Active
                          </span>
                        )
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </PopupDialog>
    </>
  );
}
