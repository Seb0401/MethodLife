import { describe, it, expect } from "vitest";
import { recommendMethod, type SelectorAnswers } from "./recommend";

const base: SelectorAnswers = {
  hasDeadline: false,
  workMode: "continuous",
  isLargeLongTerm: false,
  people: 1,
  stableRequirements: false,
};

describe("recommendMethod (RF9.2 acceptance)", () => {
  it("recommends kanban for continuous solo work with no deadline", () => {
    const rec = recommendMethod(base);
    expect(rec.method).toBe("kanban");
    // Justification is present per criterion.
    expect(rec.reasons).toHaveLength(5);
    expect(rec.reasons.some((r) => r.key === "deadline" && r.favors === "kanban")).toBe(true);
  });

  it("recommends scrum for a team with a deadline delivering increments", () => {
    const rec = recommendMethod({
      hasDeadline: true,
      workMode: "deliverables",
      isLargeLongTerm: false,
      people: 3,
      stableRequirements: false,
    });
    expect(rec.method).toBe("scrum");
    expect(rec.scores.scrum).toBeGreaterThan(rec.scores.kanban);
  });

  it("recommends fdd for a large long-term goal with stable requirements", () => {
    const rec = recommendMethod({
      hasDeadline: false,
      workMode: "deliverables",
      isLargeLongTerm: true,
      people: 2,
      stableRequirements: true,
    });
    expect(rec.method).toBe("fdd");
  });

  it("always returns a reason for every criterion", () => {
    const keys = recommendMethod(base).reasons.map((r) => r.key);
    expect(new Set(keys)).toEqual(
      new Set(["deadline", "workMode", "largeLongTerm", "people", "requirements"]),
    );
  });
});
