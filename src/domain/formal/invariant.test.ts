import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  parseRule,
  referencedAreaIds,
  referencedColumnIds,
  needsAreaWeekMetrics,
  type InvariantMetrics,
} from "./invariant";

const metrics = (over: Partial<InvariantMetrics> = {}): InvariantMetrics => ({
  wipTotal: 0,
  columnCounts: {},
  areaWeekCounts: {},
  ...over,
});

describe("evaluateRule", () => {
  it("wip_max holds at the limit and breaks above it (RF6.2)", () => {
    const rule = { type: "wip_max", max: 3 } as const;
    expect(evaluateRule(rule, metrics({ wipTotal: 3 }))).toEqual({
      holds: true,
      actual: 3,
      limit: 3,
      comparator: "lte",
    });
    expect(evaluateRule(rule, metrics({ wipTotal: 4 })).holds).toBe(false);
  });

  it("column_max counts a specific column and treats missing as zero", () => {
    const rule = { type: "column_max", columnId: "c1", max: 2 } as const;
    expect(evaluateRule(rule, metrics({ columnCounts: { c1: 2 } })).holds).toBe(true);
    expect(evaluateRule(rule, metrics({ columnCounts: { c1: 3 } })).holds).toBe(false);
    expect(evaluateRule(rule, metrics()).actual).toBe(0);
  });

  it("area_min_per_week is a floor: holds at or above the minimum", () => {
    const rule = { type: "area_min_per_week", areaId: "a1", min: 1 } as const;
    expect(evaluateRule(rule, metrics({ areaWeekCounts: { a1: 1 } }))).toEqual({
      holds: true,
      actual: 1,
      limit: 1,
      comparator: "gte",
    });
    expect(evaluateRule(rule, metrics({ areaWeekCounts: { a1: 0 } })).holds).toBe(false);
  });
});

describe("parseRule", () => {
  it("accepts each valid rule type", () => {
    expect(parseRule({ type: "wip_max", max: 3 })).toEqual({ type: "wip_max", max: 3 });
    expect(parseRule({ type: "column_max", columnId: "c1", max: 2 })).toEqual({
      type: "column_max",
      columnId: "c1",
      max: 2,
    });
    expect(parseRule({ type: "area_min_per_week", areaId: "a1", min: 1 })).toEqual({
      type: "area_min_per_week",
      areaId: "a1",
      min: 1,
    });
  });

  it("rejects malformed or unknown rules", () => {
    expect(parseRule(null)).toBeNull();
    expect(parseRule({ type: "nope" })).toBeNull();
    expect(parseRule({ type: "wip_max" })).toBeNull();
    expect(parseRule({ type: "wip_max", max: -1 })).toBeNull();
    expect(parseRule({ type: "wip_max", max: 2.5 })).toBeNull();
    expect(parseRule({ type: "column_max", max: 2 })).toBeNull();
    expect(parseRule({ type: "area_min_per_week", areaId: 5, min: 1 })).toBeNull();
  });
});

describe("referenced metrics helpers", () => {
  it("collects only the ids the rules reference", () => {
    const rules = [
      { type: "wip_max", max: 3 } as const,
      { type: "column_max", columnId: "c1", max: 2 } as const,
      { type: "area_min_per_week", areaId: "a1", min: 1 } as const,
    ];
    expect(referencedColumnIds(rules)).toEqual(["c1"]);
    expect(referencedAreaIds(rules)).toEqual(["a1"]);
    expect(needsAreaWeekMetrics(rules)).toBe(true);
    expect(needsAreaWeekMetrics([{ type: "wip_max", max: 1 }])).toBe(false);
  });
});
