import { describe, expect, it } from "vitest";
import { isTraceable, canLeaveInbox } from "./traceability";

describe("isTraceable", () => {
  it("is true when the task has a project or a goal", () => {
    expect(isTraceable({ projectId: "p", goalId: null })).toBe(true);
    expect(isTraceable({ projectId: null, goalId: "g" })).toBe(true);
    expect(isTraceable({ projectId: "p", goalId: "g" })).toBe(true);
  });

  it("is false for a fully orphan task", () => {
    expect(isTraceable({ projectId: null, goalId: null })).toBe(false);
    expect(canLeaveInbox({ projectId: null, goalId: null })).toBe(false);
  });
});
