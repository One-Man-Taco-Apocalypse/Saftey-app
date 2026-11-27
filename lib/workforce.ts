// Project workforce: foremen on a project and their crews. Pure (tested in
// workforce.test.ts); the database side is getProjectWorkforce in projects.ts.

export type WorkforceRow = { foreman_id: string; member_id: string | null; member_order: number | null };
export type ForemanCrew = { foremanId: string; memberIds: string[] };

// Rows from project_workforce() -> one entry per foreman, crew in their order.
// `nameOf` sorts the foremen A-Z.
export function groupWorkforce(rows: WorkforceRow[], nameOf: (id: string) => string): ForemanCrew[] {
  const byForeman = new Map<string, { id: string; order: number }[]>();
  for (const r of rows) {
    const crew = byForeman.get(r.foreman_id) ?? [];
    if (r.member_id) crew.push({ id: r.member_id, order: r.member_order ?? 0 });
    byForeman.set(r.foreman_id, crew);
  }
  return [...byForeman.entries()]
    .map(([foremanId, crew]) => ({
      foremanId,
      memberIds: [...new Set(crew.sort((a, b) => a.order - b.order).map((m) => m.id))],
    }))
    .sort((a, b) => nameOf(a.foremanId).localeCompare(nameOf(b.foremanId)));
}

// "Pat Lee's crew" (or "Chris' crew" for names ending in s)
export function crewTitle(name: string) {
  return /s$/i.test(name) ? `${name}' crew` : `${name}'s crew`;
}
