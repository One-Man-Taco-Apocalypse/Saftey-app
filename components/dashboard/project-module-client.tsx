"use client";

import { Check, ChevronRight, FolderKanban, Pencil, Star } from "lucide-react";
import { useState } from "react";
import { saveUserSettings } from "@/lib/save-settings";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { Module, ModuleHeader } from "./module-grid";
import { PopupButton } from "./popup";

function StarButton({
  favorite,
  disabled,
  onClick,
}: {
  favorite: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={favorite}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-muted active:scale-90 disabled:opacity-60"
    >
      <Star
        className={cn(
          "h-5 w-5 transition",
          favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
        )}
      />
    </button>
  );
}

function CurrentBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
      <Check className="h-3 w-3" />
      Current
    </span>
  );
}

export function ProjectModuleClient({
  userId,
  projects,
  initialFavorites,
  initialCurrent,
}: {
  userId: string;
  projects: Project[];
  initialFavorites: string[];
  initialCurrent: string | null;
}) {
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [current, setCurrent] = useState(initialCurrent);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save(changes: { current_project?: string; favorite_projects?: string[] }) {
    setSaving(true);
    const error = await saveUserSettings(userId, changes);
    setSaving(false);
    setSaveError(error);
    return error === null;
  }

  async function toggleFavorite(jobNumber: string) {
    const previous = favorites;
    const next = favorites.includes(jobNumber)
      ? favorites.filter((j) => j !== jobNumber)
      : [...favorites, jobNumber];

    setFavorites(next); // update the screen right away
    if (!(await save({ favorite_projects: next }))) setFavorites(previous);
  }

  async function setCurrentProject(jobNumber: string) {
    if (jobNumber === current) return;
    const previous = current;

    setCurrent(jobNumber); // update the screen right away
    if (!(await save({ current_project: jobNumber }))) setCurrent(previous);
  }

  const currentProject = projects.find((p) => p.job_number === current);
  const favoriteProjects = projects.filter((p) => favorites.includes(p.job_number));

  // What shows inside the Change Project popup: every project with a star.
  // Clicking a project's name makes it current and closes the popup
  // (a submit button inside <form method="dialog"> closes its dialog).
  const projectList =
    projects.length === 0 ? (
      <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No projects found
      </p>
    ) : (
      <form
        method="dialog"
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-muted/40"
      >
        {projects.map((project) => {
          const isCurrent = project.job_number === current;
          return (
            <div
              key={project.job_number}
              className={cn("flex items-center gap-2 py-1.5 pl-1.5 pr-2", isCurrent && "bg-sky-500/10")}
            >
              <button
                type="submit"
                onClick={() => setCurrentProject(project.job_number)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{project.job_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{project.job_number}</span>
                </span>
                {isCurrent && <CurrentBadge />}
              </button>
              <StarButton
                favorite={favorites.includes(project.job_number)}
                disabled={saving}
                onClick={() => toggleFavorite(project.job_number)}
              />
            </div>
          );
        })}
      </form>
    );

  return (
    <Module size="medium">
      <ModuleHeader
        title="Current project"
        icon={FolderKanban}
        action={
          // Opens the project list, where a project can be made current
          <PopupButton
            title="Change Project"
            popup={projectList}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            Change project
          </PopupButton>
        }
      />

      {/* Only the project name opens the project popup (blank for now) */}
      <PopupButton
        title={currentProject?.job_name ?? "Project"}
        className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-1 px-2 py-1"
      >
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-xl font-semibold tracking-tight",
              !currentProject && "text-muted-foreground",
            )}
          >
            {currentProject?.job_name ?? "No project selected"}
          </span>
          {currentProject && (
            <span className="block text-xs text-muted-foreground">Job {currentProject.job_number}</span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </PopupButton>

      {/* Favorite projects. The heading opens the Favorite Projects popup;
          each favorite has its own "Set current" button. */}
      <div className="mt-4">
        <PopupButton
          title="Favorite Projects"
          className="group -mx-2 mb-2 flex items-center gap-1 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Favorite Projects
          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </PopupButton>

        {favoriteProjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            You have no Favorite projects
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {favoriteProjects.map((project) => (
              <div
                key={project.job_number}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3"
              >
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.job_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{project.job_number}</p>
                </div>
                {project.job_number === current ? (
                  <CurrentBadge />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentProject(project.job_number)}
                    className="shrink-0 rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium transition hover:bg-muted active:scale-95"
                  >
                    Set current
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {saveError && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}
    </Module>
  );
}
