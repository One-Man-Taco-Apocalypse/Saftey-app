"use client";

import { Check, ChevronRight, FolderKanban } from "lucide-react";
import { useRef } from "react";
import { PopupDialog } from "@/components/dashboard/popup";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";

// Shows the chosen job; clicking it opens a list to pick a different one.
export function JobPicker({
  id,
  projects,
  value,
  onChange,
  invalid,
}: {
  id: string;
  projects: Project[];
  value: string;
  onChange: (jobNumber: string) => void;
  invalid?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selected = projects.find((p) => p.job_number === value);

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40",
          invalid && "border-red-400 dark:border-red-400",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <FolderKanban className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate text-sm font-medium">{selected.job_name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {selected.job_number}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Choose a job</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">Change</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
      </button>

      <PopupDialog dialogRef={dialogRef} title="Choose a job">
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No projects found
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/40">
            {projects.map((project) => {
              const isSelected = project.job_number === value;
              return (
                <button
                  key={project.job_number}
                  type="button"
                  onClick={() => {
                    onChange(project.job_number);
                    dialogRef.current?.close();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted",
                    isSelected && "bg-sky-500/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{project.job_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {project.job_number}
                    </span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-600" />}
                </button>
              );
            })}
          </div>
        )}
      </PopupDialog>
    </>
  );
}
