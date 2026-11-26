"use client";

import { Lock, UserPlus, Users, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { personName, type Person } from "@/lib/person";
import { cn } from "@/lib/utils";
import { personOption, SearchSelect } from "./search-select";
import { SignaturePad } from "./signature-pad";

export type SignatureRow = {
  key: string; // stable id for React, so each pad keeps its drawing
  userId: string; // "" until someone is chosen
  png: Blob | null;
};

// `key` is random by default. Rows that exist when the page first loads must pass
// a fixed key: the page is drawn on the server and again in the browser, and a
// random key would differ between the two (a hydration mismatch).
export function newSignatureRow(userId = "", key: string = crypto.randomUUID()): SignatureRow {
  return { key, userId, png: null };
}

// A named group of people that can be added as signers in one click.
export type QuickAddGroup = { label: string; userIds: string[] };

// Adds everyone in `userIds` who isn't already a signer, in the group's order.
// Unsigned rows still waiting for someone to be chosen are filled first, so they
// aren't left over empty. The first row ("Completed by") is never changed.
export function addSigners(
  rows: SignatureRow[],
  userIds: string[],
  validIds: Set<string>,
): SignatureRow[] {
  const taken = new Set(rows.map((r) => r.userId).filter(Boolean));
  const toAdd = [...new Set(userIds)].filter((id) => validIds.has(id) && !taken.has(id));
  if (toAdd.length === 0) return rows;

  const queue = [...toAdd];
  const filled = rows.map((r, index) =>
    // Only rows with no person AND no drawing: a drawing on an unnamed row belongs
    // to whoever drew it, so it must never be credited to a crew member.
    index > 0 && !r.userId && !r.png && queue.length > 0 ? { ...r, userId: queue.shift()! } : r,
  );
  return [...filled, ...queue.map((id) => newSignatureRow(id))];
}

// A list of signers. The first row is always whoever "Completed by" is set to
// (the form keeps it in sync); more people can be added and removed.
// Each row has its own signature pad.
export function SignatureTable({
  rows,
  onChange,
  people,
  currentUserId,
  quickAddGroups = [],
  firstSignerLabel = "Completed by",
  invalid,
}: {
  rows: SignatureRow[];
  onChange: (rows: SignatureRow[]) => void;
  people: Person[];
  currentUserId: string;
  quickAddGroups?: QuickAddGroup[];
  firstSignerLabel?: string; // label of the form's person field, e.g. "Foreman"
  invalid?: boolean;
}) {
  const personById = new Map(people.map((p) => [p.user_id, p]));
  const validIds = new Set(personById.keys());
  const signerIds = new Set(rows.map((r) => r.userId));
  const update = (key: string, changes: Partial<SignatureRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const isCompletedBy = index === 0;
        const person = personById.get(row.userId);
        const takenIds = new Set(rows.filter((r) => r.key !== row.key).map((r) => r.userId));
        // Signing now is optional: anyone who doesn't is asked to sign later
        const missing = invalid && !row.userId;

        return (
          <div
            key={row.key}
            className={cn(
              "rounded-2xl border border-white/60 bg-white/50 p-3 dark:border-white/10 dark:bg-white/5",
              missing && "border-red-400 dark:border-red-400",
            )}
          >
            <div className="mb-3 flex items-center gap-3">
              {isCompletedBy ? (
                // The "Completed by" person: set by that field, can't be removed here
                <>
                  <Avatar color={person?.color ?? "#d1d5db"} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {person ? personName(person) : `Choose the ${firstSignerLabel.toLowerCase()} above`}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({firstSignerLabel}{row.userId === currentUserId ? " · You" : ""})
                      </span>
                    </p>
                    {person?.position && (
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    )}
                  </div>
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={`Set by ${firstSignerLabel}`} />
                </>
              ) : (
                // Other rows: pick who's signing
                <>
                  <Avatar color={person?.color ?? "#d1d5db"} className="h-8 w-8" />
                  <SearchSelect
                    aria-label={`Signer ${index + 1}`}
                    value={row.userId}
                    onChange={(userId) => update(row.key, { userId })}
                    className="min-w-0 flex-1"
                    placeholder="Choose a person…"
                    searchPlaceholder="Search people"
                    options={people
                      .filter((p) => p.user_id === row.userId || !takenIds.has(p.user_id))
                      .map((p) => personOption(p))}
                  />
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                    aria-label="Remove signer"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <SignaturePad
              id={`signature-${row.key}`}
              onChange={(png) => update(row.key, { png })}
            />
            {row.userId && !row.png && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Not signed yet — they&apos;ll be asked to sign after you submit.
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...rows, newSignatureRow()])}
        disabled={rows.length >= people.length && people.length > 0}
        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/15 p-3 text-sm font-medium text-muted-foreground transition hover:border-sky-400 hover:bg-sky-500/5 hover:text-sky-600 disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        Add person
      </button>

      {quickAddGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick add
          </span>
          {quickAddGroups.map((group) => {
            // Only count people who still exist and aren't already signing
            const members = group.userIds.filter((id) => validIds.has(id));
            const remaining = members.filter((id) => !signerIds.has(id));
            const empty = members.length === 0;
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => onChange(addSigners(rows, group.userIds, validIds))}
                disabled={remaining.length === 0}
                title={
                  empty
                    ? `No one in ${group.label.toLowerCase()} yet`
                    : remaining.length === 0
                      ? `Everyone in ${group.label.toLowerCase()} is already added`
                      : `Add ${remaining.length} ${remaining.length === 1 ? "person" : "people"} from ${group.label.toLowerCase()}`
                }
                // No pointer-events-none when disabled, so the title tooltip still shows on hover
                className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-sm font-medium transition enabled:hover:bg-white/90 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:enabled:hover:bg-white/15"
              >
                <Users className="h-3.5 w-3.5" />
                {group.label}
                {/* The badge always says why the button can or can't be used */}
                <span className="rounded-full bg-foreground/10 px-1.5 text-xs tabular-nums">
                  {empty ? "None set" : remaining.length === 0 ? "All added" : `+${remaining.length}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
