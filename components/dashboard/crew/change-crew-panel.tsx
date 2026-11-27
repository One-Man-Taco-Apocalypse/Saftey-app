"use client";

import { Search, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { personName, type Person } from "@/lib/person";
import { cn } from "@/lib/utils";

// Inside the "Change Crew" popup: search everyone, add or remove from the crew.
export function ChangeCrewPanel({
  people,
  crewIds,
  currentUserId,
  saving,
  saveError,
  onToggle,
}: {
  people: Person[];
  crewIds: string[];
  currentUserId: string;
  saving: boolean;
  saveError: string | null;
  onToggle: (personId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const onCrew = new Set(crewIds);

  const query = search.trim().toLowerCase();
  const results = query
    ? people.filter((p) =>
        `${personName(p)} ${p.email ?? ""} ${p.position ?? ""}`.toLowerCase().includes(query),
      )
    : people;

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-border bg-muted/40">
        {results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {people.length === 0 ? "No people found" : "No matches"}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {results.map((person) => {
              const member = onCrew.has(person.user_id);
              return (
                <div
                  key={person.user_id}
                  className={cn("flex items-center gap-3 py-2 pl-3 pr-2", member && "bg-violet-500/10")}
                >
                  <Avatar color={person.color} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {personName(person)}
                      {person.user_id === currentUserId && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(You)</span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.position ?? person.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggle(person.user_id)}
                    disabled={saving}
                    aria-label={member ? "Remove from crew" : "Add to crew"}
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-60",
                      member
                        ? "text-red-500 hover:bg-red-500/10"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {member ? <UserMinus className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
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
}
