import { describe, it, expect } from "vitest";
import { analysisComplete, analysisDaysLeft, daysBetween } from "./analysis";

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("analysis phase timing (RF5.3)", () => {
  it("counts whole UTC days between dates", () => {
    expect(daysBetween(day(2026, 7, 1), day(2026, 7, 8))).toBe(7);
    expect(daysBetween(day(2026, 7, 8), day(2026, 7, 1))).toBe(-7);
    expect(daysBetween(day(2026, 7, 1), day(2026, 7, 1))).toBe(0);
  });

  it("is complete once analysisDays have elapsed", () => {
    const start = day(2026, 7, 1);
    expect(analysisComplete(start, 7, day(2026, 7, 7))).toBe(false);
    expect(analysisComplete(start, 7, day(2026, 7, 8))).toBe(true);
    expect(analysisComplete(start, 7, day(2026, 7, 20))).toBe(true);
  });

  it("reports remaining days, flooring at zero", () => {
    const start = day(2026, 7, 1);
    expect(analysisDaysLeft(start, 7, day(2026, 7, 1))).toBe(7);
    expect(analysisDaysLeft(start, 7, day(2026, 7, 5))).toBe(3);
    expect(analysisDaysLeft(start, 7, day(2026, 7, 30))).toBe(0);
  });
});
