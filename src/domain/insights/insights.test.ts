import { describe, it, expect } from "vitest";
import { evaluateInsights, INSIGHT_CATALOG, type InsightFacts } from "./catalog";
import { detectInconsistencies } from "./inconsistencies";

const facts = (over: Partial<InsightFacts> = {}): InsightFacts => ({
  wipInProgress: 0,
  invariantViolationsLast7: 0,
  activeInvariants: 0,
  violatedInvariants: 0,
  overdueTasks: 0,
  dueTodayTasks: 0,
  deadGoals: 0,
  orphanTasks: 0,
  activeProjects: 0,
  coupledAreas: 0,
  habitsInVerification: 0,
  totalTasks: 0,
  ...over,
});

describe("insight catalog (RF11.1/11.2)", () => {
  it("ships ten rules", () => {
    expect(INSIGHT_CATALOG).toHaveLength(10);
  });

  it("fires nothing on an empty workspace", () => {
    expect(evaluateInsights(facts())).toEqual([]);
  });

  it("fires high_wip with the triggering numbers (transparency)", () => {
    const hits = evaluateInsights(facts({ wipInProgress: 7 }));
    const wip = hits.find((h) => h.key === "high_wip");
    expect(wip).toBeDefined();
    expect(wip!.data).toEqual({ wip: 7, limit: 5 });
    expect(wip!.tone).toBe("warning");
  });

  it("fires the invariant-violations rule above the threshold", () => {
    expect(
      evaluateInsights(facts({ invariantViolationsLast7: 3 })).some(
        (h) => h.key === "invariant_violations",
      ),
    ).toBe(true);
    expect(
      evaluateInsights(facts({ invariantViolationsLast7: 2 })).some(
        (h) => h.key === "invariant_violations",
      ),
    ).toBe(false);
  });

  it("recognises a healthy state as a positive insight", () => {
    const hits = evaluateInsights(facts({ activeInvariants: 2, violatedInvariants: 0 }));
    const ok = hits.find((h) => h.key === "all_invariants_holding");
    expect(ok?.tone).toBe("positive");
  });
});

describe("inconsistency detection (RF11.3)", () => {
  it("reports each kind of model inconsistency", () => {
    const items = detectInconsistencies({
      goalsWithoutArea: 1,
      brokenInvariants: [{ name: "WIP salud" }],
      routinesWithoutRequirements: [{ name: "Mañana" }],
    });
    expect(items).toEqual([
      { kind: "goal_no_area", count: 1 },
      { kind: "invariant_broken_ref", name: "WIP salud" },
      { kind: "routine_no_requirements", name: "Mañana" },
    ]);
  });

  it("returns nothing for a consistent model", () => {
    expect(
      detectInconsistencies({
        goalsWithoutArea: 0,
        brokenInvariants: [],
        routinesWithoutRequirements: [],
      }),
    ).toEqual([]);
  });
});
