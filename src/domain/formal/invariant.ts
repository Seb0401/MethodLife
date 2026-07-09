// Declarative invariant DSL and evaluator (RF6.2/6.3). Rules are small JSON
// objects describing a count-based predicate over the workspace's data; this
// module is pure — the server computes the metrics and asks here whether the
// rule still holds. Violations are recorded as events by the caller.

export type Comparator = "lte" | "gte";

// The initial predicate set (roadmap 3.3): counts by total-WIP, by column, and
// by area over a trailing week.
export type InvariantRule =
  | { type: "wip_max"; max: number }
  | { type: "column_max"; columnId: string; max: number }
  | { type: "area_min_per_week"; areaId: string; min: number };

export type InvariantRuleType = InvariantRule["type"];
export const INVARIANT_RULE_TYPES: readonly InvariantRuleType[] = [
  "wip_max",
  "column_max",
  "area_min_per_week",
] as const;

// The metrics the evaluator reads. The server fills only what the active rules
// reference (see referencedColumnIds / referencedAreaIds).
export type InvariantMetrics = {
  // Tasks currently in progress across the whole workspace.
  wipTotal: number;
  // taskCount keyed by column id.
  columnCounts: Record<string, number>;
  // Tasks touched in an area within the trailing 7 days, keyed by area id.
  areaWeekCounts: Record<string, number>;
};

export type Evaluation = {
  holds: boolean;
  actual: number;
  limit: number;
  comparator: Comparator;
};

function isFiniteInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

// Parses untrusted JSON (a stored invariants.rule column or form input) into a
// typed rule, or null if it does not match the DSL.
export function parseRule(raw: unknown): InvariantRule | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  switch (r.type) {
    case "wip_max":
      return isFiniteInt(r.max) && r.max >= 0 ? { type: "wip_max", max: r.max } : null;
    case "column_max":
      return typeof r.columnId === "string" && isFiniteInt(r.max) && r.max >= 0
        ? { type: "column_max", columnId: r.columnId, max: r.max }
        : null;
    case "area_min_per_week":
      return typeof r.areaId === "string" && isFiniteInt(r.min) && r.min >= 0
        ? { type: "area_min_per_week", areaId: r.areaId, min: r.min }
        : null;
    default:
      return null;
  }
}

// Evaluates a rule against the metrics. Ceilings (max) hold while actual <= max;
// floors (min) hold while actual >= min.
export function evaluateRule(rule: InvariantRule, m: InvariantMetrics): Evaluation {
  switch (rule.type) {
    case "wip_max":
      return {
        holds: m.wipTotal <= rule.max,
        actual: m.wipTotal,
        limit: rule.max,
        comparator: "lte",
      };
    case "column_max": {
      const actual = m.columnCounts[rule.columnId] ?? 0;
      return { holds: actual <= rule.max, actual, limit: rule.max, comparator: "lte" };
    }
    case "area_min_per_week": {
      const actual = m.areaWeekCounts[rule.areaId] ?? 0;
      return { holds: actual >= rule.min, actual, limit: rule.min, comparator: "gte" };
    }
  }
}

// Column ids referenced by a set of rules — lets the server compute only the
// counts it needs.
export function referencedColumnIds(rules: InvariantRule[]): string[] {
  return rules.flatMap((r) => (r.type === "column_max" ? [r.columnId] : []));
}

export function referencedAreaIds(rules: InvariantRule[]): string[] {
  return rules.flatMap((r) => (r.type === "area_min_per_week" ? [r.areaId] : []));
}

// True if any active rule needs the trailing-week area counts (a heavier query).
export function needsAreaWeekMetrics(rules: InvariantRule[]): boolean {
  return rules.some((r) => r.type === "area_min_per_week");
}
