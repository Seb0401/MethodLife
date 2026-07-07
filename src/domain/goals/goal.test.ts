import { describe, expect, it } from "vitest";
import { canTransitionGoal } from "./goal";

describe("canTransitionGoal", () => {
  it("allows moving between different statuses", () => {
    expect(canTransitionGoal("active", "done")).toBe(true);
    expect(canTransitionGoal("active", "abandoned")).toBe(true);
    expect(canTransitionGoal("done", "active")).toBe(true);
    expect(canTransitionGoal("abandoned", "active")).toBe(true);
  });

  it("rejects a no-op transition", () => {
    expect(canTransitionGoal("active", "active")).toBe(false);
    expect(canTransitionGoal("done", "done")).toBe(false);
  });
});
