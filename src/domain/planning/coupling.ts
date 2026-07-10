// Temporal coupling detection (RF10.2). Reinterpreted from P5: active projects
// that share an area compete for the same weekly dedication slot, so groups of
// two or more active projects in one area are flagged as coupled. Pure.

export type ProjectSlot = {
  id: string;
  name: string;
  areaId: string;
  areaName: string;
  status: "active" | "paused" | "archived";
};

export type CoupledGroup = {
  areaId: string;
  areaName: string;
  projects: { id: string; name: string }[];
};

export function detectTemporalCoupling(projects: ProjectSlot[]): CoupledGroup[] {
  const byArea = new Map<string, ProjectSlot[]>();
  for (const p of projects) {
    if (p.status !== "active") continue;
    const list = byArea.get(p.areaId) ?? [];
    list.push(p);
    byArea.set(p.areaId, list);
  }

  const groups: CoupledGroup[] = [];
  for (const [areaId, ps] of byArea) {
    if (ps.length >= 2) {
      groups.push({
        areaId,
        areaName: ps[0].areaName,
        projects: ps.map((p) => ({ id: p.id, name: p.name })),
      });
    }
  }
  return groups;
}

// Set of project ids that are temporally coupled (for map highlighting).
export function coupledProjectIds(groups: CoupledGroup[]): Set<string> {
  return new Set(groups.flatMap((g) => g.projects.map((p) => p.id)));
}
