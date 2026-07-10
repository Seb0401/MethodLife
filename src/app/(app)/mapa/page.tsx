import { getWorkspaceContext } from "@/lib/workspace/get-workspace-context";
import { prisma } from "@/lib/prisma";
import {
  detectTemporalCoupling,
  coupledProjectIds,
  type ProjectSlot,
} from "@/domain/planning/coupling";
import { DependencyMap, type MapNode, type MapEdge } from "@/components/planning/dependency-map";
import { es } from "@/lib/i18n/es";

export default async function MapPage() {
  const ctx = await getWorkspaceContext();

  const [goals, projects, links] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    }),
    prisma.project.findMany({
      where: { workspaceId: ctx.workspace.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        goalId: true,
        areaId: true,
        area: { select: { name: true } },
      },
    }),
    prisma.goalLink.findMany({
      where: { fromGoal: { workspaceId: ctx.workspace.id } },
      select: { id: true, fromGoalId: true, toGoalId: true, type: true },
    }),
  ]);

  const slots: ProjectSlot[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    areaId: p.areaId,
    areaName: p.area.name,
    status: p.status,
  }));
  const coupling = detectTemporalCoupling(slots);
  const coupled = coupledProjectIds(coupling);

  const nodes: MapNode[] = [
    ...goals.map((g) => ({ id: g.id, label: g.title, kind: "goal" as const })),
    ...projects.map((p) => ({
      id: p.id,
      label: p.name,
      kind: "project" as const,
      coupled: coupled.has(p.id),
    })),
  ];

  const goalIds = new Set(goals.map((g) => g.id));
  const edges: MapEdge[] = [
    // A project belongs to its goal.
    ...projects
      .filter((p) => p.goalId && goalIds.has(p.goalId))
      .map((p) => ({
        id: `b-${p.id}`,
        source: p.id,
        target: p.goalId as string,
        kind: "belongs" as const,
      })),
    // Goal relations. Refinements read as dependencies for the map.
    ...links.map((l) => ({
      id: `l-${l.id}`,
      source: l.fromGoalId,
      target: l.toGoalId,
      kind: (l.type === "conflicts" ? "conflicts" : "depends_on") as MapEdge["kind"],
    })),
  ];

  const hasGraph = nodes.length > 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{es.map.title}</h1>
        <p className="text-sm text-neutral-500">{es.map.subtitle}</p>
      </header>

      {!hasGraph ? (
        <p className="text-sm text-neutral-500">{es.map.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
            <span>🟦 {es.map.legendGoal}</span>
            <span>⬜ {es.map.legendProject}</span>
            <span className="text-red-500">▢ {es.map.legendCoupled}</span>
          </div>
          <DependencyMap nodes={nodes} edges={edges} />
        </>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">{es.map.couplingTitle}</h2>
        <p className="text-xs text-neutral-500">{es.map.couplingHint}</p>
        {coupling.length === 0 ? (
          <p className="text-sm text-neutral-500">{es.map.noCoupling}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {coupling.map((g) => (
              <li
                key={g.areaId}
                className="rounded-md border border-red-200 bg-red-50 p-2 text-sm dark:border-red-900 dark:bg-red-950/40"
              >
                <span className="font-medium">{g.areaName}</span>:{" "}
                {g.projects.map((p) => p.name).join(", ")}
                <span className="mt-0.5 block text-xs text-red-600">
                  {es.map.couplingSuggestion}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
