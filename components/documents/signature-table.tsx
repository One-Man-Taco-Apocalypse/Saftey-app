"use client";

import { Lock, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { personName, type Person } from "@/lib/person";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./signature-pad";
import { inputClass } from "./styles";

export type SignatureRow = {
  key: string; // stable id for React, so each pad keeps its drawing
  userId: string; // "" until someone is chosen
  png: Blob | null;
};

export function newSignatureRow(userId = ""): SignatureRow {
  return { key: crypto.randomUUID(), userId, png: null };
}

// A list of signers. The first row is always whoever "Completed by" is set to
// (the form keeps it in sync); more people can be added and removed.
// Each row has its own signature pad.
export function SignatureTable({
  rows,
  onChange,
  people,
  currentUserId,
  invalid,
}: {
  rows: SignatureRow[];
  onChange: (rows: SignatureRow[]) => void;
  people: Person[];
  currentUserId: string;
  invalid?: boolean;
}) {
  const personById = new Map(people.map((p) => [p.user_id, p]));
  const update = (key: string, changes: Partial<SignatureRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const isCompletedBy = index === 0;
        const person = personById.get(row.userId);
        const takenIds = new Set(rows.filter((r) => r.key !== row.key).map((r) => r.userId));
        const missing = invalid && (!row.userId || !row.png);

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
                      {person ? personName(person) : "Choose who completed this above"}
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (Completed by{row.userId === currentUserId ? " · You" : ""})
                      </span>
                    </p>
                    {person?.position && (
                      <p className="text-xs text-muted-foreground">{person.position}</p>
                    )}
                  </div>
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Set by Completed by" />
                </>
              ) : (
                // Other rows: pick who's signing
                <>
                  <Avatar color={person?.color ?? "#d1d5db"} className="h-8 w-8" />
                  <select
                    aria-label={`Signer ${index + 1}`}
                    value={row.userId}
                    onChange={(e) => update(row.key, { userId: e.target.value })}
                    className={cn(inputClass, "min-w-0 flex-1 py-2", !row.userId && "text-muted-foreground")}
                  >
                    <option value="" disabled>
                      Choose a person…
                    </option>
                    {people
                      .filter((p) => p.user_id === row.userId || !takenIds.has(p.user_id))
                      .map((p) => (
                        <option key={p.user_id} value={p.user_id} className="text-foreground">
                          {personName(p)}
                          {p.position ? ` — ${p.position}` : ""}
                        </option>
                      ))}
                  </select>
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
              invalid={missing && !row.png}
            />
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
    </div>
  );
}
