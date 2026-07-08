import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  average,
  computeFlowMetrics,
  startOfUtcDay,
  taskMetric,
  throughputByDay,
  type TaskEvents,
  type TaskMetric,
} from "./metrics";

const HOUR_MS = 60 * 60 * 1000;
// A fixed UTC reference so the hand-calculated numbers are unambiguous.
const BASE = Date.UTC(2026, 0, 5, 0, 0, 0); // 2026-01-05T00:00:00Z

describe("taskMetric", () => {
  it("computes lead time from arrival and cycle time from first in_progress", () => {
    // arrival at BASE, work starts +2h, done +6h.
    const events: TaskEvents = {
      taskId: "t1",
      transitions: [
        { toStatus: "todo", at: BASE },
        { toStatus: "in_progress", at: BASE + 2 * HOUR_MS },
        { toStatus: "done", at: BASE + 6 * HOUR_MS },
      ],
    };
    expect(taskMetric(events)).toEqual({
      taskId: "t1",
      completedAt: BASE + 6 * HOUR_MS,
      leadTimeMs: 6 * HOUR_MS,
      cycleTimeMs: 4 * HOUR_MS,
    });
  });

  it("is order-independent (sorts transitions by time)", () => {
    const events: TaskEvents = {
      taskId: "t1",
      transitions: [
        { toStatus: "done", at: BASE + 6 * HOUR_MS },
        { toStatus: "todo", at: BASE },
        { toStatus: "in_progress", at: BASE + 2 * HOUR_MS },
      ],
    };
    const m = taskMetric(events);
    expect(m?.leadTimeMs).toBe(6 * HOUR_MS);
    expect(m?.cycleTimeMs).toBe(4 * HOUR_MS);
  });

  it("returns null cycle time when the task never entered in_progress", () => {
    const events: TaskEvents = {
      taskId: "t1",
      transitions: [
        { toStatus: "todo", at: BASE },
        { toStatus: "done", at: BASE + HOUR_MS },
      ],
    };
    const m = taskMetric(events);
    expect(m?.leadTimeMs).toBe(HOUR_MS);
    expect(m?.cycleTimeMs).toBeNull();
  });

  it("returns null while the task is not done", () => {
    expect(
      taskMetric({
        taskId: "t1",
        transitions: [{ toStatus: "in_progress", at: BASE }],
      }),
    ).toBeNull();
  });

  it("returns null with no transitions", () => {
    expect(taskMetric({ taskId: "t1", transitions: [] })).toBeNull();
  });
});

describe("average", () => {
  it("averages values", () => {
    expect(average([2, 4, 6])).toBe(4);
  });
  it("returns null for an empty list", () => {
    expect(average([])).toBeNull();
  });
});

describe("startOfUtcDay", () => {
  it("floors to the UTC midnight of the containing day", () => {
    expect(startOfUtcDay(BASE + 13 * HOUR_MS)).toBe(BASE);
  });
});

describe("throughputByDay", () => {
  it("builds a contiguous series with zero-filled days", () => {
    const metrics: TaskMetric[] = [
      { taskId: "a", completedAt: BASE, leadTimeMs: 1, cycleTimeMs: 1 },
      { taskId: "b", completedAt: BASE + 3 * HOUR_MS, leadTimeMs: 1, cycleTimeMs: 1 },
      { taskId: "c", completedAt: BASE - DAY_MS, leadTimeMs: 1, cycleTimeMs: 1 },
    ];
    // 3-day window ending on the day containing BASE.
    const series = throughputByDay(metrics, 3, BASE + HOUR_MS);
    expect(series).toEqual([
      { day: BASE - 2 * DAY_MS, count: 0 },
      { day: BASE - DAY_MS, count: 1 },
      { day: BASE, count: 2 },
    ]);
  });

  it("ignores completions outside the window", () => {
    const metrics: TaskMetric[] = [
      { taskId: "old", completedAt: BASE - 10 * DAY_MS, leadTimeMs: 1, cycleTimeMs: 1 },
    ];
    const series = throughputByDay(metrics, 3, BASE);
    expect(series.every((b) => b.count === 0)).toBe(true);
  });
});

describe("computeFlowMetrics", () => {
  it("aggregates a hand-calculated board", () => {
    // Task A: lead 6h, cycle 4h, done on day BASE.
    // Task B: lead 2h, cycle 1h, done on day BASE.
    // Task C: still in progress (no metric).
    const tasks: TaskEvents[] = [
      {
        taskId: "a",
        transitions: [
          { toStatus: "todo", at: BASE },
          { toStatus: "in_progress", at: BASE + 2 * HOUR_MS },
          { toStatus: "done", at: BASE + 6 * HOUR_MS },
        ],
      },
      {
        taskId: "b",
        transitions: [
          { toStatus: "todo", at: BASE },
          { toStatus: "in_progress", at: BASE + HOUR_MS },
          { toStatus: "done", at: BASE + 2 * HOUR_MS },
        ],
      },
      {
        taskId: "c",
        transitions: [{ toStatus: "in_progress", at: BASE }],
      },
    ];

    const m = computeFlowMetrics(tasks, { days: 2, now: BASE + 12 * HOUR_MS });
    expect(m.completedCount).toBe(2);
    // avg lead = (6h + 2h) / 2 = 4h
    expect(m.avgLeadTimeMs).toBe(4 * HOUR_MS);
    // avg cycle = (4h + 1h) / 2 = 2.5h
    expect(m.avgCycleTimeMs).toBe(2.5 * HOUR_MS);
    expect(m.throughput).toEqual([
      { day: BASE - DAY_MS, count: 0 },
      { day: BASE, count: 2 },
    ]);
  });

  it("reports null averages for a board with no completed tasks", () => {
    const m = computeFlowMetrics([{ taskId: "c", transitions: [{ toStatus: "todo", at: BASE }] }], {
      days: 1,
      now: BASE,
    });
    expect(m.completedCount).toBe(0);
    expect(m.avgLeadTimeMs).toBeNull();
    expect(m.avgCycleTimeMs).toBeNull();
  });
});
