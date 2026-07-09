import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateRule,
  needsAreaWeekMetrics,
  parseRule,
  referencedAreaIds,
  referencedColumnIds,
  type InvariantMetrics,
  type InvariantRule,
} from "@/domain/formal/invariant";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Builds only the metrics the active rules actually reference (RF6.3): the pure
// evaluator asks for wipTotal / columnCounts / areaWeekCounts, and we skip the
// heavier queries when no rule needs them.
async function computeMetrics(
  workspaceId: string,
  rules: InvariantRule[],
): Promise<InvariantMetrics> {
  const needsWip = rules.some((r) => r.type === "wip_max");
  const columnIds = referencedColumnIds(rules);
  const areaIds = referencedAreaIds(rules);

  const wipTotal = needsWip
    ? await prisma.task.count({ where: { workspaceId, status: "in_progress" } })
    : 0;

  const columnCounts: Record<string, number> = {};
  if (columnIds.length > 0) {
    const grouped = await prisma.task.groupBy({
      by: ["columnId"],
      where: { workspaceId, columnId: { in: columnIds } },
      _count: { _all: true },
    });
    for (const g of grouped) {
      if (g.columnId) columnCounts[g.columnId] = g._count._all;
    }
  }

  const areaWeekCounts: Record<string, number> = {};
  if (needsAreaWeekMetrics(rules)) {
    const since = new Date(Date.now() - WEEK_MS);
    for (const areaId of areaIds) {
      areaWeekCounts[areaId] = await prisma.task.count({
        where: {
          workspaceId,
          createdAt: { gte: since },
          OR: [{ project: { areaId } }, { goal: { areaId } }],
        },
      });
    }
  }

  return { wipTotal, columnCounts, areaWeekCounts };
}

// Evaluates every enabled invariant of a workspace after a relevant event
// (RF6.3, e.g. "task_moved"). A holding→violated flip records exactly one
// violation row carrying the triggering event (RF6.4); a violated→holding flip
// clears the status without an event. Best-effort: never throws into the caller,
// so an evaluation hiccup can't undo the primary mutation.
export async function evaluateInvariants(workspaceId: string, event: string): Promise<void> {
  try {
    const invariants = await prisma.invariant.findMany({
      where: { workspaceId, enabled: true },
      select: { id: true, rule: true, status: true },
    });
    if (invariants.length === 0) return;

    const parsed = invariants
      .map((inv) => ({ inv, rule: parseRule(inv.rule) }))
      .filter(
        (x): x is { inv: (typeof invariants)[number]; rule: InvariantRule } => x.rule !== null,
      );
    if (parsed.length === 0) return;

    const metrics = await computeMetrics(
      workspaceId,
      parsed.map((p) => p.rule),
    );

    for (const { inv, rule } of parsed) {
      const evaluation = evaluateRule(rule, metrics);
      if (!evaluation.holds && inv.status === "holding") {
        await prisma.$transaction([
          prisma.invariantViolation.create({
            data: {
              invariantId: inv.id,
              triggeredBy: event,
              details: {
                actual: evaluation.actual,
                limit: evaluation.limit,
                comparator: evaluation.comparator,
                rule: rule as unknown as Prisma.InputJsonValue,
              } as Prisma.InputJsonValue,
            },
          }),
          prisma.invariant.update({ where: { id: inv.id }, data: { status: "violated" } }),
        ]);
      } else if (evaluation.holds && inv.status === "violated") {
        await prisma.invariant.update({ where: { id: inv.id }, data: { status: "holding" } });
      }
    }
  } catch (error) {
    console.error("evaluateInvariants failed", error);
  }
}
