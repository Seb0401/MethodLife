import { describe, it, expect } from "vitest";
import { doneCount, featureWeight, weightedProgress, weightedProgressPercent } from "./progress";
import { weeklyCompletion } from "./weekly";
import type { FeatureStatus } from "./progress";

describe("weighted FDD progress (RF4.3)", () => {
  it("is zero with no features", () => {
    expect(weightedProgress([])).toBe(0);
    expect(weightedProgressPercent([])).toBe(0);
  });

  it("averages the milestone weights across features", () => {
    // 10 features: 5 done (1.0) + 5 in design (0.1) → (5 + 0.5) / 10 = 0.55
    const statuses: FeatureStatus[] = [...Array(5).fill("done"), ...Array(5).fill("design")];
    expect(weightedProgressPercent(statuses)).toBe(55);
    expect(doneCount(statuses)).toBe(5);
  });

  it("reaches 100% only when every feature is done", () => {
    expect(weightedProgressPercent(["done", "done"])).toBe(100);
    expect(weightedProgressPercent(["done", "build_reviewed"])).toBe(95);
  });

  it("orders weights monotonically by milestone", () => {
    expect(featureWeight("design")).toBeLessThan(featureWeight("design_reviewed"));
    expect(featureWeight("build_reviewed")).toBeLessThan(featureWeight("done"));
  });
});

describe("weeklyCompletion (RF4.4)", () => {
  const today = new Date(Date.UTC(2026, 6, 29));

  it("produces a cumulative rising series ending today", () => {
    // 4 features total; two done 3 weeks ago, one done this week.
    const firstDone = [
      new Date(Date.UTC(2026, 6, 8)),
      new Date(Date.UTC(2026, 6, 8)),
      new Date(Date.UTC(2026, 6, 27)),
    ];
    const series = weeklyCompletion(firstDone, 4, today, 4);
    expect(series).toHaveLength(4);
    expect(series[series.length - 1].weekEnd).toBe("2026-07-29");
    // Non-decreasing percentages.
    for (let i = 1; i < series.length; i++) {
      expect(series[i].percent).toBeGreaterThanOrEqual(series[i - 1].percent);
    }
    // By today, 3 of 4 done → 75%.
    expect(series[series.length - 1].percent).toBe(75);
  });

  it("is all zero when nothing is done", () => {
    const series = weeklyCompletion([], 5, today, 3);
    expect(series.every((p) => p.percent === 0)).toBe(true);
  });
});
