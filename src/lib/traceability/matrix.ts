import { prisma } from "@/lib/prisma";
import { findDeadGoals } from "@/domain/traceability/dead-goals";

// Loads the traceability data for a workspace (RF7.2/7.3/7.4): the goal×project
// task-count matrix, dead-goal detection, orphan work and goal relations. Shared
// by the page and the Markdown export so they never drift.
export async function loadTraceability(workspaceId: string) {
  const [goals, projects, tasks, links] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId },
      orderBy: [{ areaId: "asc" }, { createdAt: "asc" }],
      include: { area: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { workspaceId, inbox: false },
      select: { goalId: true, projectId: true, status: true },
    }),
    prisma.goalLink.findMany({
      where: { fromGoal: { workspaceId } },
      orderBy: { createdAt: "asc" },
      include: {
        fromGoal: { select: { title: true } },
        toGoal: { select: { title: true } },
      },
    }),
  ]);

  const counts = new Map<string, number>();
  const activeByGoal = new Map<string, number>();
  let orphanCount = 0;
  for (const t of tasks) {
    if (!t.goalId) {
      orphanCount++;
      continue;
    }
    if (t.projectId) {
      const key = `${t.goalId}|${t.projectId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (t.status !== "done") activeByGoal.set(t.goalId, (activeByGoal.get(t.goalId) ?? 0) + 1);
  }

  const deadIds = new Set(
    findDeadGoals(
      goals.map((g) => ({
        id: g.id,
        status: g.status,
        activeTaskCount: activeByGoal.get(g.id) ?? 0,
      })),
    ),
  );

  return { goals, projects, counts, deadIds, orphanCount, links };
}

export type TraceabilityData = Awaited<ReturnType<typeof loadTraceability>>;
