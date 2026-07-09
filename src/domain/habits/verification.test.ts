import { describe, it, expect } from "vitest";
import {
  evaluateVerification,
  isValidVerificationRule,
  parseVerificationRule,
  requiredDays,
  type CheckinLike,
  type VerificationRule,
} from "./verification";

const rule: VerificationRule = { condition: "done", windowDays: 14, tolerance: 2 };

// Builds `n` consecutive "done" check-ins ending on `end`.
function doneDays(end: Date, n: number): CheckinLike[] {
  return Array.from({ length: n }, (_, i) => ({
    date: new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i)),
    result: "done" as const,
  }));
}

describe("verification rule validation", () => {
  it("requires a sane window and tolerance", () => {
    expect(isValidVerificationRule(rule)).toBe(true);
    expect(isValidVerificationRule({ condition: "done", windowDays: 0, tolerance: 0 })).toBe(false);
    expect(isValidVerificationRule({ condition: "done", windowDays: 3, tolerance: 3 })).toBe(false);
    expect(isValidVerificationRule({ condition: "done", windowDays: 5, tolerance: -1 })).toBe(
      false,
    );
  });

  it("parses valid JSON and rejects junk", () => {
    expect(parseVerificationRule({ windowDays: 14, tolerance: 2 })).toEqual(rule);
    expect(parseVerificationRule({ windowDays: 14 })).toBeNull();
    expect(parseVerificationRule(null)).toBeNull();
    expect(parseVerificationRule({ windowDays: 2, tolerance: 5 })).toBeNull();
  });

  it("computes the required number of done days", () => {
    expect(requiredDays(rule)).toBe(12);
  });
});

describe("evaluateVerification (RF5.5)", () => {
  const today = new Date(Date.UTC(2026, 6, 14));

  it("passes at exactly 12 of the last 14 days", () => {
    const result = evaluateVerification(rule, doneDays(today, 12), today);
    expect(result).toEqual({ passed: true, doneCount: 12, required: 12, windowDays: 14 });
  });

  it("fails below the requirement", () => {
    const result = evaluateVerification(rule, doneDays(today, 11), today);
    expect(result.passed).toBe(false);
    expect(result.doneCount).toBe(11);
  });

  it("ignores done days outside the window and non-done results", () => {
    const old: CheckinLike = { date: new Date(Date.UTC(2026, 5, 1)), result: "done" };
    const occurrence: CheckinLike = { date: today, result: "occurrence" };
    const result = evaluateVerification(rule, [...doneDays(today, 12), old, occurrence], today);
    expect(result.doneCount).toBe(12);
  });

  it("counts each calendar day once", () => {
    const dup: CheckinLike = { date: today, result: "done" };
    const result = evaluateVerification(rule, [...doneDays(today, 12), dup], today);
    expect(result.doneCount).toBe(12);
  });
});
