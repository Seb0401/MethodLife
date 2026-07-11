import type { HabitStatus, ProjectMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentStreak } from "@/domain/habits/analysis";

const MS_PER_DAY = 86_400_000;
const ACTIVITY_DAYS = 14;

export type ActivityBucket = { label: string; checkins: number; tasksDone: number };

export type DashboardSummary = {
  tasks: {
    active: number;
    done: number;
    todo: number;
    inProgress: number;
    byPriority: { low: number; medium: number; high: number };
  };
  projects: { active: number; byMethod: { method: ProjectMethod; count: number }[] };
  goals: {
    active: number;
    done: number;
    abandoned: number;
    upcoming: { id: string; title: string; area: string; targetDate: Date }[];
  };
  habits: {
    total: number;
    items: { id: string; name: string; status: HabitStatus; streak: number }[];
  };
  invariants: { holding: number; violated: number };
  activity: ActivityBucket[];
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Aggregates a workspace's cross-module state for the dashboard. Time series are
// built from the immutable event tables (habit check-ins, task transitions),
// consistent with the app's "metrics derive from events" rule.
export async function loadDashboardSummary(
  workspaceId: string,
  now: Date = new Date(),
): Promise<DashboardSummary> {
  const since = new Date(startOfUtcDay(now) - (ACTIVITY_DAYS - 1) * MS_PER_DAY);

  const [
    tasksByStatus,
    activeByPriority,
    activeProjects,
    projectsByMethod,
    goalsByStatus,
    upcomingGoals,
    habits,
    invariantsByStatus,
    checkins,
    doneTransitions,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { workspaceId, inbox: false },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: { workspaceId, inbox: false, status: { not: "done" } },
      _count: { _all: true },
    }),
    prisma.project.count({ where: { workspaceId, status: "active" } }),
    prisma.project.groupBy({
      by: ["method"],
      where: { workspaceId, status: "active" },
      _count: { _all: true },
    }),
    prisma.goal.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: { _all: true },
    }),
    prisma.goal.findMany({
      where: { workspaceId, status: "active", targetDate: { not: null } },
      orderBy: { targetDate: "asc" },
      take: 4,
      select: { id: true, title: true, targetDate: true, area: { select: { name: true } } },
    }),
    prisma.habit.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        checkins: { where: { result: "done" }, select: { date: true } },
      },
    }),
    prisma.invariant.groupBy({
      by: ["status"],
      where: { workspaceId, enabled: true },
      _count: { _all: true },
    }),
    prisma.habitCheckin.findMany({
      where: { habit: { workspaceId }, date: { gte: since } },
      select: { date: true },
    }),
    prisma.taskTransition.findMany({
      where: { task: { workspaceId }, toStatus: "done", at: { gte: since } },
      select: { at: true },
    }),
  ]);

  const statusCount = (s: string) => tasksByStatus.find((r) => r.status === s)?._count._all ?? 0;
  const priorityCount = (p: string) =>
    activeByPriority.find((r) => r.priority === p)?._count._all ?? 0;
  const goalCount = (s: string) => goalsByStatus.find((r) => r.status === s)?._count._all ?? 0;

  // Build the empty day buckets first, then fold events in.
  const buckets = new Map<number, ActivityBucket>();
  const order: number[] = [];
  for (let i = 0; i < ACTIVITY_DAYS; i++) {
    const epoch = startOfUtcDay(now) - (ACTIVITY_DAYS - 1 - i) * MS_PER_DAY;
    const d = new Date(epoch);
    buckets.set(epoch, {
      label: `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      checkins: 0,
      tasksDone: 0,
    });
    order.push(epoch);
  }
  for (const c of checkins) {
    const b = buckets.get(startOfUtcDay(c.date));
    if (b) b.checkins++;
  }
  for (const t of doneTransitions) {
    const b = buckets.get(startOfUtcDay(t.at));
    if (b) b.tasksDone++;
  }

  return {
    tasks: {
      active: statusCount("todo") + statusCount("in_progress"),
      done: statusCount("done"),
      todo: statusCount("todo"),
      inProgress: statusCount("in_progress"),
      byPriority: {
        low: priorityCount("low"),
        medium: priorityCount("medium"),
        high: priorityCount("high"),
      },
    },
    projects: {
      active: activeProjects,
      byMethod: projectsByMethod
        .map((r) => ({ method: r.method, count: r._count._all }))
        .sort((a, b) => b.count - a.count),
    },
    goals: {
      active: goalCount("active"),
      done: goalCount("done"),
      abandoned: goalCount("abandoned"),
      upcoming: upcomingGoals.map((g) => ({
        id: g.id,
        title: g.title,
        area: g.area.name,
        targetDate: g.targetDate as Date,
      })),
    },
    habits: {
      total: habits.length,
      items: habits.map((h) => ({
        id: h.id,
        name: h.name,
        status: h.status,
        streak: currentStreak(
          h.checkins.map((c) => c.date),
          now,
        ),
      })),
    },
    invariants: {
      holding: invariantsByStatus.find((r) => r.status === "holding")?._count._all ?? 0,
      violated: invariantsByStatus.find((r) => r.status === "violated")?._count._all ?? 0,
    },
    activity: order.map((e) => buckets.get(e)!),
  };
}
