import { prisma } from "@/lib/prisma";
import { loadTraceability } from "@/lib/traceability/matrix";
import { detectTemporalCoupling, type ProjectSlot } from "@/domain/planning/coupling";
import { parseRule } from "@/domain/formal/invariant";
import type { InsightFacts } from "@/domain/insights/catalog";
import type { InconsistencyInput } from "@/domain/insights/inconsistencies";

function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Gathers the metrics the insight catalog (RF11.1) and inconsistency check
// (RF11.3) need. Reuses the traceability loader for dead goals / orphan work.
export async function gatherInsightData(
  workspaceId: string,
): Promise<{ facts: InsightFacts; inconsistencies: InconsistencyInput }> {
  const trace = await loadTraceability(workspaceId);
  const today = todayUtc();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    wipInProgress,
    activeInvariants,
    violatedInvariants,
    invariantViolationsLast7,
    overdueTasks,
    dueTodayTasks,
    habitsInVerification,
    totalTasks,
    invariants,
    areas,
    columns,
    routines,
  ] = await Promise.all([
    prisma.task.count({ where: { workspaceId, status: "in_progress" } }),
    prisma.invariant.count({ where: { workspaceId, enabled: true } }),
    prisma.invariant.count({ where: { workspaceId, enabled: true, status: "violated" } }),
    prisma.invariantViolation.count({
      where: { invariant: { workspaceId }, at: { gte: weekAgo } },
    }),
    prisma.task.count({
      where: { workspaceId, inbox: false, status: { not: "done" }, dueDate: { lt: today } },
    }),
    prisma.task.count({
      where: { workspaceId, inbox: false, status: { not: "done" }, dueDate: today },
    }),
    prisma.habit.count({ where: { workspaceId, status: "verification" } }),
    prisma.task.count({ where: { workspaceId, inbox: false } }),
    prisma.invariant.findMany({ where: { workspaceId }, select: { name: true, rule: true } }),
    prisma.lifeArea.findMany({ where: { workspaceId }, select: { id: true } }),
    prisma.boardColumn.findMany({
      where: { board: { project: { workspaceId } } },
      select: { id: true },
    }),
    prisma.routine.findMany({
      where: { workspaceId },
      select: {
        name: true,
        versions: {
          orderBy: { number: "desc" },
          take: 1,
          select: { _count: { select: { requirements: true } } },
        },
      },
    }),
  ]);

  // The traceability loader doesn't carry project status/area, so query the
  // coupling inputs directly.
  const projectsForCoupling = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true, name: true, status: true, areaId: true, area: { select: { name: true } } },
  });
  const slots: ProjectSlot[] = projectsForCoupling.map((p) => ({
    id: p.id,
    name: p.name,
    areaId: p.areaId,
    areaName: p.area.name,
    status: p.status,
  }));
  const coupling = detectTemporalCoupling(slots);

  const facts: InsightFacts = {
    wipInProgress,
    invariantViolationsLast7,
    activeInvariants,
    violatedInvariants,
    overdueTasks,
    dueTodayTasks,
    deadGoals: trace.deadIds.size,
    orphanTasks: trace.orphanCount,
    activeProjects: projectsForCoupling.filter((p) => p.status === "active").length,
    coupledAreas: coupling.length,
    habitsInVerification,
    totalTasks,
  };

  // Inconsistencies (RF11.3).
  const areaIds = new Set(areas.map((a) => a.id));
  const columnIds = new Set(columns.map((c) => c.id));
  const brokenInvariants = invariants
    .filter((inv) => {
      const rule = parseRule(inv.rule);
      if (!rule) return true; // an unparseable rule is itself an inconsistency
      if (rule.type === "area_min_per_week") return !areaIds.has(rule.areaId);
      if (rule.type === "column_max") return !columnIds.has(rule.columnId);
      return false;
    })
    .map((inv) => ({ name: inv.name }));

  const routinesWithoutRequirements = routines
    .filter((r) => (r.versions[0]?._count.requirements ?? 0) === 0)
    .map((r) => ({ name: r.name }));

  return {
    facts,
    inconsistencies: {
      goalsWithoutArea: 0, // schema enforces goal → area
      brokenInvariants,
      routinesWithoutRequirements,
    },
  };
}
