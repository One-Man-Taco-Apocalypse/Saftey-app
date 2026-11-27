import { Mail } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { personName, type Person } from "@/lib/person";

// What shows inside a person's popup.
export function PersonDetails({ person }: { person: Person }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar color={person.color} className="h-16 w-16" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{personName(person)}</p>
          {person.position && <p className="text-sm text-muted-foreground">{person.position}</p>}
        </div>
      </div>

      {person.email && (
        <div className="mt-6 rounded-xl border border-border bg-muted/40">
          <div className="flex items-center gap-3 p-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{person.email}</span>
          </div>
        </div>
      )}
    </div>
  );
}
