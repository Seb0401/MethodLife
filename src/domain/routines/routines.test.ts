import { describe, it, expect } from "vitest";
import { compliance, compliancePercent, consolidateResults } from "./evaluation";
import { isVersionOpen, nextVersionNumber } from "./version";

describe("consolidateResults (RF8.6)", () => {
  it("returns null when nobody evaluated", () => {
    expect(consolidateResults([])).toBeNull();
  });

  it("is met only when met strictly outnumbers not-met", () => {
    expect(consolidateResults(["met", "met", "not_met"])).toBe("met");
    expect(consolidateResults(["met", "not_met"])).toBe("not_met"); // tie → not_met
    expect(consolidateResults(["not_met"])).toBe("not_met");
    expect(consolidateResults(["met"])).toBe("met");
  });
});

describe("compliance", () => {
  it("ignores days without evaluations", () => {
    expect(compliance([null, "met", null, "not_met"])).toBe(0.5);
    expect(compliancePercent(["met", "met", "met", "not_met"])).toBe(75);
  });

  it("is zero when never evaluated", () => {
    expect(compliance([null, null])).toBe(0);
    expect(compliancePercent([])).toBe(0);
  });
});

describe("version numbering (RF8.2)", () => {
  it("starts at 1 and increments from the max", () => {
    expect(nextVersionNumber([])).toBe(1);
    expect(nextVersionNumber([1, 2, 3])).toBe(4);
    expect(nextVersionNumber([2])).toBe(3);
  });

  it("reports open versions", () => {
    expect(isVersionOpen(null)).toBe(true);
    expect(isVersionOpen(new Date())).toBe(false);
  });
});
