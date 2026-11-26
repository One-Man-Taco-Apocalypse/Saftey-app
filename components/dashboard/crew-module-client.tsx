"use client";

import { Mail, Pencil, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { personName, type Person } from "@/lib/person";
import { saveUserSettings } from "@/lib/save-settings";
import { cn } from "@/lib/utils";
import { Module } from "./module-grid";
import { PopupButton } from "./popup";

// What shows inside a person's popup.
function PersonDetails({ person }: { person: Person }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar color={person.color} className="h-16 w-16" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{personName(person)}</p>
          {person.position && (
            <p className="text-sm text-muted-foreground">{person.position}</p>
          )}
        </div>
      </div>

      {person.email && (
        <div className="mt-6 rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3 p-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{person.email}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function CrewModuleClient({
  userId,
  people,
  initialCrew,
}: {
  userId: string;
  people: Person[];
  initialCrew: string[];
}) {
  const [crewIds, setCrewIds] = useState<string[]>(initialCrew);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function toggleMember(personId: string) {
    const previous = crewIds;
    const next = crewIds.includes(personId)
      ? crewIds.filter((id) => id !== personId)
      : [...crewIds, personId];

    setCrewIds(next); // update the screen right away
    setSaving(true);
    const error = await saveUserSettings(userId, { crew_members: next });
    setSaving(false);
    setSaveError(error);
    if (error) setCrewIds(previous); // undo on the screen
  }

  // Keep the order people were added in
  const crew = crewIds
    .map((id) => people.find((p) => p.user_id === id))
    .filter((p): p is Person => !!p);

  const query = search.trim().toLowerCase();
  const searchResults = people.filter((p) =>
    `${personName(p)} ${p.email ?? ""} ${p.position ?? ""}`.toLowerCase().includes(query),
  );

  // What shows inside the Change Crew popup
  const changeCrew = (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people"
          className="h-10 w-full rounded-xl border border-white/70 bg-white/60 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-sky-500 dark:border-white/15 dark:bg-white/10"
        />
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto rounded-2xl border border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/5">
        {searchResults.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {people.length === 0 ? "No people found" : "No matches"}
          </p>
        ) : (
          <div className="divide-y divide-foreground/10">
            {searchResults.map((person) => {
              const onCrew = crewIds.includes(person.user_id);
              return (
                <div
                  key={person.user_id}
                  className={cn(
                    "flex items-center gap-3 py-2 pl-3 pr-2",
                    onCrew && "bg-violet-500/10",
                  )}
                >
                  <Avatar color={person.color} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {personName(person)}
                      {person.user_id === userId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.position ?? person.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMember(person.user_id)}
                    disabled={saving}
                    aria-label={onCrew ? "Remove from crew" : "Add to crew"}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-60",
                      onCrew
                        ? "text-red-500 hover:bg-red-500/10"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    {onCrew ? (
                      <UserMinus className="h-5 w-5" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {saveError && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}
    </div>
  );

  return (
    <Module size="medium">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
          <Users className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">Crew</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight">
            {crew.length} {crew.length === 1 ? "person" : "people"}
          </p>
        </div>

        <PopupButton
          title="Change Crew"
          popup={changeCrew}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-sm font-medium hover:bg-white/90 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Pencil className="h-3.5 w-3.5" />
          Change crew
        </PopupButton>
      </div>

      {/* One small card per crew member; each opens that person's popup */}
      {crew.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
          No one on your crew yet
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {crew.map((person) => (
            <PopupButton
              key={person.user_id}
              title={personName(person)}
              popup={<PersonDetails person={person} />}
              className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/50 p-3 hover:-translate-y-0.5 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Avatar color={person.color} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {personName(person)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {person.position ?? person.email}
                </span>
              </span>
            </PopupButton>
          ))}
        </div>
      )}

      {saveError && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {saveError}
        </p>
      )}
    </Module>
  );
}
