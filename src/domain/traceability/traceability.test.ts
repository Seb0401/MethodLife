import { describe, it, expect } from "vitest";
import { hasPath, wouldCreateCycle, type GoalEdge } from "./graph";
import { findDeadGoals, isDeadGoal } from "./dead-goals";

describe("goal dependency cycles (RF7.4)", () => {
  const edges: GoalEdge[] = [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ];

  it("finds reachable targets", () => {
    expect(hasPath(edges, "a", "c")).toBe(true);
    expect(hasPath(edges, "c", "a")).toBe(false);
  });

  it("rejects an edge that would close a cycle", () => {
    // a -> b -> c already; adding c -> a closes the loop.
    expect(wouldCreateCycle(edges, "c", "a")).toBe(true);
    // adding a -> c is fine (still acyclic).
    expect(wouldCreateCycle(edges, "a", "c")).toBe(false);
  });

  it("rejects a self-loop", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("handles an empty graph", () => {
    expect(wouldCreateCycle([], "a", "b")).toBe(false);
  });
});

describe("dead goals (RF7.3)", () => {
  it("flags active goals with no active tasks", () => {
    const goals = [
      { id: "g1", status: "active" as const, activeTaskCount: 0 },
      { id: "g2", status: "active" as const, activeTaskCount: 3 },
      { id: "g3", status: "done" as const, activeTaskCount: 0 },
    ];
    expect(findDeadGoals(goals)).toEqual(["g1"]);
    expect(isDeadGoal(goals[0])).toBe(true);
    expect(isDeadGoal(goals[1])).toBe(false);
    expect(isDeadGoal(goals[2])).toBe(false);
  });
});
