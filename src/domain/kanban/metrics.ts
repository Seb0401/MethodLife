// Flow metrics computed purely from transition events (RF3.4, RF3.5).
// The server never stores lead/cycle time as a column: it derives them from the
// immutable `task_transitions` log, honouring design rule 2 ("events, not just
// states"). Everything here is pure and unit-tested; no Next/React/Prisma deps.
import type { TaskStatus } from "./status";

export const DAY_MS = 24 * 60 * 60 * 1000;

// A single transition of one task, reduced to what the metrics need: the status
// it moved into and when. `at` is epoch milliseconds so the module stays free of
// Date-object concerns and is trivial to test.
export type TransitionInput = { toStatus: TaskStatus; at: number };

// All transitions belonging to one task (order does not matter; we sort here).
export type TaskEvents = { taskId: string; transitions: TransitionInput[] };

export type TaskMetric = {
  taskId: string;
  completedAt: number;
  // Lead time: from the task's arrival on the board (its first transition) to
  // the moment it reached "done".
  leadTimeMs: number;
  // Cycle time: from the first time work started ("in_progress") to "done".
  // Null when the task jumped straight to done without a WIP stage.
  cycleTimeMs: number | null;
};

// Per-task metric. Returns null while the task has not reached "done" — only
// completed work contributes to flow metrics.
export function taskMetric(events: TaskEvents): TaskMetric | null {
  if (events.transitions.length === 0) return null;
  const sorted = [...events.transitions].sort((a, b) => a.at - b.at);

  const done = sorted.find((t) => t.toStatus === "done");
  if (!done) return null;

  const arrival = sorted[0].at;
  const startedAt = sorted.find((t) => t.toStatus === "in_progress")?.at ?? null;

  return {
    taskId: events.taskId,
    completedAt: done.at,
    leadTimeMs: Math.max(0, done.at - arrival),
    cycleTimeMs: startedAt != null ? Math.max(0, done.at - startedAt) : null,
  };
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Start of the UTC day containing `ms`. Bucketing by UTC keeps the domain pure;
// the exact day boundary is not material to throughput trends.
export function startOfUtcDay(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

// One day of the throughput series. `day` is the UTC start-of-day epoch.
export type ThroughputBucket = { day: number; count: number };

// Contiguous throughput series: how many tasks completed on each of the last
// `days` days (inclusive of the day containing `now`). Days with no completions
// appear as zeroes so the chart has no gaps.
export function throughputByDay(
  metrics: TaskMetric[],
  days: number,
  now: number,
): ThroughputBucket[] {
  const today = startOfUtcDay(now);
  const buckets: ThroughputBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ day: today - i * DAY_MS, count: 0 });
  }
  const indexByDay = new Map(buckets.map((b, i) => [b.day, i]));
  for (const m of metrics) {
    const i = indexByDay.get(startOfUtcDay(m.completedAt));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

export type FlowMetrics = {
  completedCount: number;
  avgLeadTimeMs: number | null;
  avgCycleTimeMs: number | null;
  throughput: ThroughputBucket[];
};

// Aggregate flow metrics for a board from its tasks' transition events.
export function computeFlowMetrics(
  tasks: TaskEvents[],
  opts: { days: number; now: number },
): FlowMetrics {
  const metrics = tasks.map(taskMetric).filter((m): m is TaskMetric => m !== null);

  return {
    completedCount: metrics.length,
    avgLeadTimeMs: average(metrics.map((m) => m.leadTimeMs)),
    avgCycleTimeMs: average(metrics.flatMap((m) => (m.cycleTimeMs != null ? [m.cycleTimeMs] : []))),
    throughput: throughputByDay(metrics, opts.days, opts.now),
  };
}
