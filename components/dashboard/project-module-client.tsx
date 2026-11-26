"use client";

import { Check, ChevronRight, FolderKanban, Star } from "lucide-react";
import { useState } from "react";
import { saveUserSettings } from "@/lib/save-settings";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { Module } from "./module-grid";
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
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-foreground/5 active:scale-90 disabled:opacity-60"
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

  async function save(changes: {
    current_project?: string;
    favorite_projects?: string[];
  }) {
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

  // What shows inside the Projects popup: every project with a star.
  // Clicking a project's name makes it current and closes the popup
  // (a submit button inside <form method="dialog"> closes its dialog).
  const projectList =
    projects.length === 0 ? (
      <p className="rounded-2xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
        No projects found
      </p>
    ) : (
      <form
        method="dialog"
        className="divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5"
      >
        {projects.map((project) => {
          const isCurrent = project.job_number === current;
          return (
            <div
              key={project.job_number}
              className={cn(
                "flex items-center gap-2 py-1.5 pl-1.5 pr-2",
                isCurrent && "bg-sky-500/10",
              )}
            >
              <button
                type="submit"
                onClick={() => setCurrentProject(project.job_number)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-foreground/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {project.job_name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {project.job_number}
                  </span>
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
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            Current Project:
          </p>
          {/* Only the project name opens the project popup */}
          <PopupButton
            title="Projects"
            popup={projectList}
            className="group -mx-2 mt-0.5 flex w-[calc(100%+1rem)] items-center gap-1 px-2"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight",
                !currentProject && "text-muted-foreground",
              )}
            >
              {currentProject?.job_name ?? "No project selected"}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
          </PopupButton>
          {currentProject && (
            <p className="text-xs text-muted-foreground">
              {currentProject.job_number}
            </p>
          )}
        </div>
      </div>

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
          <p className="rounded-2xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
            You have no Favorite projects
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {favoriteProjects.map((project) => (
              <div
                key={project.job_number}
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5"
              >
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {project.job_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {project.job_number}
                  </p>
                </div>
                {project.job_number === current ? (
                  <CurrentBadge />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentProject(project.job_number)}
                    className="shrink-0 rounded-full border border-white/70 bg-white/60 px-3 py-1 text-xs font-medium transition hover:bg-white/90 active:scale-95 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
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
