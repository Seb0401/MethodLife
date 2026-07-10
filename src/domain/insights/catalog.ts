// Insight rule catalog (RF11.1). Declarative-ish: each rule is a pure predicate
// over a facts snapshot that, when it fires, returns the data that triggered it
// (RF11.2 transparency). The UI turns `key` + `data` into a Spanish explanation.
// This is the system catalog; per-workspace customization comes later.

export type InsightFacts = {
  wipInProgress: number;
  invariantViolationsLast7: number;
  activeInvariants: number;
  violatedInvariants: number;
  overdueTasks: number;
  dueTodayTasks: number;
  deadGoals: number;
  orphanTasks: number;
  activeProjects: number;
  coupledAreas: number;
  habitsInVerification: number;
  totalTasks: number;
};

export type InsightHit = {
  key: string;
  tone: "warning" | "positive";
  data: Record<string, number>;
};

type InsightRule = { key: string; evaluate: (f: InsightFacts) => InsightHit | null };

const WIP_LIMIT = 5;
const ACTIVE_PROJECT_LIMIT = 4;

export const INSIGHT_CATALOG: InsightRule[] = [
  {
    key: "high_wip",
    evaluate: (f) =>
      f.wipInProgress > WIP_LIMIT
        ? { key: "high_wip", tone: "warning", data: { wip: f.wipInProgress, limit: WIP_LIMIT } }
        : null,
  },
  {
    key: "invariant_violations",
    evaluate: (f) =>
      f.invariantViolationsLast7 > 2
        ? {
            key: "invariant_violations",
            tone: "warning",
            data: { count: f.invariantViolationsLast7 },
          }
        : null,
  },
  {
    key: "overdue_pileup",
    evaluate: (f) =>
      f.overdueTasks >= 3
        ? { key: "overdue_pileup", tone: "warning", data: { count: f.overdueTasks } }
        : null,
  },
  {
    key: "dead_goals",
    evaluate: (f) =>
      f.deadGoals >= 1
        ? { key: "dead_goals", tone: "warning", data: { count: f.deadGoals } }
        : null,
  },
  {
    key: "orphan_work",
    evaluate: (f) =>
      f.orphanTasks >= 3
        ? { key: "orphan_work", tone: "warning", data: { count: f.orphanTasks } }
        : null,
  },
  {
    key: "temporal_coupling",
    evaluate: (f) =>
      f.coupledAreas >= 1
        ? { key: "temporal_coupling", tone: "warning", data: { areas: f.coupledAreas } }
        : null,
  },
  {
    key: "too_many_active_projects",
    evaluate: (f) =>
      f.activeProjects > ACTIVE_PROJECT_LIMIT
        ? {
            key: "too_many_active_projects",
            tone: "warning",
            data: { count: f.activeProjects, limit: ACTIVE_PROJECT_LIMIT },
          }
        : null,
  },
  {
    key: "busy_today",
    evaluate: (f) =>
      f.dueTodayTasks >= 5
        ? { key: "busy_today", tone: "warning", data: { count: f.dueTodayTasks } }
        : null,
  },
  {
    key: "habits_in_verification",
    evaluate: (f) =>
      f.habitsInVerification >= 1
        ? {
            key: "habits_in_verification",
            tone: "positive",
            data: { count: f.habitsInVerification },
          }
        : null,
  },
  {
    key: "all_invariants_holding",
    evaluate: (f) =>
      f.activeInvariants > 0 && f.violatedInvariants === 0
        ? {
            key: "all_invariants_holding",
            tone: "positive",
            data: { count: f.activeInvariants },
          }
        : null,
  },
];

// Runs the whole catalog against a facts snapshot (RF11.1).
export function evaluateInsights(facts: InsightFacts): InsightHit[] {
  return INSIGHT_CATALOG.map((rule) => rule.evaluate(facts)).filter(
    (hit): hit is InsightHit => hit !== null,
  );
}
