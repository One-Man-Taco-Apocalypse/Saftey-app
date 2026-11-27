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
import { Module, ModuleHeader, type ModuleSize } from "./module-grid";
import { PopupButton } from "./popup";

// The interactive Crew card: who's on the crew, their recent documents, and
// the "Change crew" popup. Data is loaded by crew-module.tsx on the server.
export function CrewModuleClient({
  size = "medium",
  userId,
  people,
  initialCrew,
  crewDocuments,
  templateNames,
}: {
  size?: ModuleSize;
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
    if (error)
      setCrewIds(previous); // undo on the screen
    else router.refresh(); // load documents for anyone just added
  }

  // Keep the order people were added in
  const personById = lookup(people, (p) => p.user_id);
  const crew = crewIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);

  return (
    <Module size={size} id="crew" className="scroll-mt-20">
      <ModuleHeader
        title="My crew"
        description={`${crew.length} ${crew.length === 1 ? "person" : "people"} · documents from the last 12 hours`}
        icon={Users}
        tone="violet"
        action={
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
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-3.5 w-3.5" />
            Change crew
          </PopupButton>
        }
      />

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
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No one on your crew yet
        </p>
      ) : (
        // As many columns as fit: 1 on phones, 2 in the overview card, more on the full-width tab
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] items-start gap-2">
          {crew.map((person) => (
            <div
              key={person.user_id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-2"
            >
              <PopupButton
                title={personName(person)}
                popup={<PersonDetails person={person} />}
                className="flex items-center gap-3 p-1 hover:bg-muted"
              >
                <Avatar color={person.color} className="h-8 w-8" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{personName(person)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {person.position ?? person.email}
                  </span>
                </span>
              </PopupButton>
              <CrewMemberDocuments
                documents={crewDocuments[person.user_id] ?? []}
                templateNames={templateNames}
              />
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
