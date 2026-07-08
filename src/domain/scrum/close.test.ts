import { describe, expect, it } from "vitest";
import { computeVelocity, isCompleted, splitByCompletion } from "./close";
import { sprintSummaryToMarkdown, type SprintSummaryLabels } from "./summary";

const tasks = [
  { id: "a", title: "Login", status: "done" as const, estimate: 5 },
  { id: "b", title: "Signup", status: "done" as const, estimate: 3 },
  { id: "c", title: "Reset", status: "in_progress" as const, estimate: 8 },
  { id: "d", title: "Audit", status: "todo" as const, estimate: null },
];

describe("isCompleted / computeVelocity", () => {
  it("velocity sums only completed points", () => {
    expect(computeVelocity(tasks)).toBe(8); // 5 + 3
  });

  it("counts done as completed and others as not", () => {
    expect(isCompleted({ status: "done" })).toBe(true);
    expect(isCompleted({ status: "in_progress" })).toBe(false);
    expect(isCompleted({ status: "todo" })).toBe(false);
  });
});

describe("splitByCompletion", () => {
  it("separates completed from incomplete", () => {
    const { completed, incomplete } = splitByCompletion(tasks);
    expect(completed.map((t) => t.id)).toEqual(["a", "b"]);
    expect(incomplete.map((t) => t.id)).toEqual(["c", "d"]);
  });
});

const labels: SprintSummaryLabels = {
  title: "Resumen del sprint",
  sprint: "Sprint",
  dates: "Fechas",
  velocity: "Velocity",
  completed: "Completadas",
  incomplete: "Incompletas",
  points: "pts",
  none: "Ninguna",
};

describe("sprintSummaryToMarkdown", () => {
  it("renders velocity and both lists", () => {
    const md = sprintSummaryToMarkdown({
      sprintName: "Sprint 1",
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-15T00:00:00Z"),
      velocity: 8,
      completed: [{ title: "Login", estimate: 5 }],
      incomplete: [{ title: "Reset", estimate: 8 }],
      labels,
    });
    expect(md).toContain("# Resumen del sprint");
    expect(md).toContain("- **Sprint:** Sprint 1");
    expect(md).toContain("- **Fechas:** 2026-07-01 – 2026-07-15");
    expect(md).toContain("- **Velocity:** 8 pts");
    expect(md).toContain("## Completadas (1)");
    expect(md).toContain("- Login (5 pts)");
    expect(md).toContain("## Incompletas (1)");
    expect(md).toContain("- Reset (8 pts)");
  });

  it("uses the empty placeholder when a list is empty", () => {
    const md = sprintSummaryToMarkdown({
      sprintName: "Sprint 2",
      startsAt: new Date("2026-07-01T00:00:00Z"),
      endsAt: new Date("2026-07-15T00:00:00Z"),
      velocity: 0,
      completed: [],
      incomplete: [],
      labels,
    });
    expect(md).toContain("## Completadas (0)");
    expect(md.match(/- Ninguna/g)?.length).toBe(2);
  });
});
