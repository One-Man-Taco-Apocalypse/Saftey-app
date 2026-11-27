import { HardHat } from "lucide-react";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Module, ModuleHeader } from "@/components/dashboard/module-grid";
import { personName, type Person } from "@/lib/person";
import { getPeople } from "@/lib/people";
import { getProjectSettings, getProjectWorkforce } from "@/lib/projects";
import { getCurrentUser } from "@/lib/user";
import { lookup } from "@/lib/utils";
import { crewTitle, groupWorkforce } from "@/lib/workforce";

function WorkerCard({ person }: { person: Person }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
      <Avatar color={person.color} className="h-7 w-7" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{personName(person)}</span>
        {person.position && (
          <span className="block truncate text-xs text-muted-foreground">{person.position}</span>
        )}
      </span>
    </li>
  );
}

// Everyone working on the active project, grouped by foreman: a card per
// foreman ("Pat Lee's crew") holding a small card per worker.
// Who counts as a foreman on the project: see migration 25.
export async function WorkforceCard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { current } = await getProjectSettings(user.id);
  const [rows, people] = await Promise.all([current ? getProjectWorkforce(current) : [], getPeople()]);
  const personById = lookup(people, (p) => p.user_id);
  const nameOf = (id: string) => {
    const p = personById.get(id);
    return p ? personName(p) : "Unknown";
  };
  const crews = groupWorkforce(rows, nameOf);
  const headcount = new Set(crews.flatMap((c) => [c.foremanId, ...c.memberIds])).size;

  return (
    <Module size="full">
      <ModuleHeader
        title="Project workforce"
        description={
          current
            ? `${crews.length} ${crews.length === 1 ? "crew" : "crews"} · ${headcount} people`
            : undefined
        }
        icon={HardHat}
        tone="amber"
      />

      {!current ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Choose an active project above to see who&apos;s working on it
        </p>
      ) : crews.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No foremen on this project yet. Foremen appear here when they set it as their active project, or
          when they&apos;re given a Foreman role on Edit projects.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {crews.map(({ foremanId, memberIds }) => {
            const foreman = personById.get(foremanId);
            const members = memberIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);
            return (
              <section key={foremanId} className="rounded-xl border border-border bg-muted/40 p-3">
                <header className="mb-3 flex items-center gap-3">
                  <Avatar color={foreman?.color ?? "#6b7280"} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{crewTitle(nameOf(foremanId))}</h3>
                    <p className="text-xs text-muted-foreground">
                      {foreman?.position ?? "Foreman"} · {members.length}{" "}
                      {members.length === 1 ? "worker" : "workers"}
                    </p>
                  </div>
                </header>
                {members.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    No one on this crew yet
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {members.map((m) => (
                      <WorkerCard key={m.user_id} person={m} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Module>
  );
}

export function WorkforceCardSkeleton() {
  return (
    <Module size="full">
      <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
      </div>
    </Module>
  );
}
