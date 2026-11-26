"use client";

import { Pencil, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import type { CrewDocument } from "@/lib/crew-status";
import { personName, type Person } from "@/lib/person";
import { saveUserSettings } from "@/lib/save-settings";
import { lookup } from "@/lib/utils";
import { ChangeCrewPanel } from "./crew/change-crew-panel";
import { CrewMemberDocuments } from "./crew/crew-member-documents";
import { PersonDetails } from "./crew/person-details";
import { SignatureRequestsLiveRefresh } from "./live-refresh";
import { Module } from "./module-grid";
import { PopupButton } from "./popup";

// The interactive Crew card: who's on the crew, their recent documents, and
// the "Change crew" popup. Data is loaded by crew-module.tsx on the server.
export function CrewModuleClient({
  userId,
  people,
  initialCrew,
  crewDocuments,
  templateNames,
}: {
  userId: string;
  people: Person[];
  initialCrew: string[];
  crewDocuments: Record<string, CrewDocument[]>; // per crew member, last 12 hours
  templateNames: Record<string, string>;
}) {
  const router = useRouter();
  const [crewIds, setCrewIds] = useState<string[]>(initialCrew);
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
    else router.refresh(); // load documents for anyone just added
  }

  // Keep the order people were added in
  const personById = lookup(people, (p) => p.user_id);
  const crew = crewIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);

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
          popup={
            <ChangeCrewPanel
              people={people}
              crewIds={crewIds}
              currentUserId={userId}
              saving={saving}
              saveError={saveError}
              onToggle={toggleMember}
            />
          }
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-sm font-medium hover:bg-white/90 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <Pencil className="h-3.5 w-3.5" />
          Change crew
        </PopupButton>
      </div>

      {/* Live: updates as soon as a crew member signs, is asked to, or submits a
          document; every 5 minutes it also re-checks the 12-hour window */}
      <SignatureRequestsLiveRefresh
        userIds={crewIds}
        channelName="crew-documents"
        includeSubmissions
        includeRequests
        refreshEveryMinutes={5}
      />

      {/* One card per crew member: their name (opens their popup), then their
          documents from the last 12 hours with their own status on each */}
      {crew.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-foreground/15 p-4 text-center text-sm text-muted-foreground">
          No one on your crew yet
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
          {crew.map((person) => (
            <div
              key={person.user_id}
              className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/50 p-2 dark:border-white/10 dark:bg-white/5"
            >
              <PopupButton
                title={personName(person)}
                popup={<PersonDetails person={person} />}
                className="flex items-center gap-3 p-1 hover:bg-white/60 dark:hover:bg-white/10"
              >
                <Avatar color={person.color} className="h-8 w-8" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{personName(person)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {person.position ?? person.email}
                  </span>
                </span>
              </PopupButton>
              <CrewMemberDocuments documents={crewDocuments[person.user_id] ?? []} templateNames={templateNames} />
            </div>
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
