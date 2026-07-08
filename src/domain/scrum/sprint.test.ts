import { describe, expect, it } from "vitest";
import { canAssignToSprint, canTransitionSprint, isValidSprintRange } from "./sprint";

describe("canAssignToSprint", () => {
  it("allows planning while planned or active, blocks when closed", () => {
    expect(canAssignToSprint("planned")).toBe(true);
    expect(canAssignToSprint("active")).toBe(true);
    expect(canAssignToSprint("closed")).toBe(false);
  });
});

describe("canTransitionSprint", () => {
  it("allows planned→active and active→closed only", () => {
    expect(canTransitionSprint("planned", "active")).toBe(true);
    expect(canTransitionSprint("active", "closed")).toBe(true);
  });

  it("rejects backward, skipping and no-op transitions", () => {
    expect(canTransitionSprint("planned", "closed")).toBe(false);
    expect(canTransitionSprint("active", "planned")).toBe(false);
    expect(canTransitionSprint("closed", "active")).toBe(false);
    expect(canTransitionSprint("active", "active")).toBe(false);
  });
});

describe("isValidSprintRange", () => {
  it("accepts end on or after start, rejects end before start", () => {
    expect(isValidSprintRange(new Date("2026-07-01"), new Date("2026-07-15"))).toBe(true);
    expect(isValidSprintRange(new Date("2026-07-01"), new Date("2026-07-01"))).toBe(true);
    expect(isValidSprintRange(new Date("2026-07-15"), new Date("2026-07-01"))).toBe(false);
  });
});
