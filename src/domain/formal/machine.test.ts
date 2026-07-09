import { describe, it, expect } from "vitest";
import {
  applyEvent,
  canTransition,
  isValidState,
  nextTransitions,
  parseMachine,
  targetFor,
  INVALID_TRANSITION,
} from "./machine";
import { HABIT_MACHINE, toStoredMachine } from "./machines";

describe("state machine engine", () => {
  it("accepts a legal habit transition and rejects an illegal one", () => {
    expect(canTransition(HABIT_MACHINE, "detected", "analysis")).toBe(true);
    expect(canTransition(HABIT_MACHINE, "detected", "overcome")).toBe(false);
  });

  it("resolves the relapse edge back to correction (RF5.6)", () => {
    expect(targetFor(HABIT_MACHINE, "verification", "relapse")).toBe("correction");
    expect(targetFor(HABIT_MACHINE, "verification", "verify_passed")).toBe("overcome");
  });

  it("applyEvent returns the next state for a valid event", () => {
    const result = applyEvent(HABIT_MACHINE, "correction", "start_verification");
    expect(result).toEqual({ ok: true, value: "verification" });
  });

  it("applyEvent errors on an event not available from the state", () => {
    const result = applyEvent(HABIT_MACHINE, "detected", "verify_passed");
    expect(result).toEqual({
      ok: false,
      error: { code: INVALID_TRANSITION, message: INVALID_TRANSITION },
    });
  });

  it("lists only the transitions leaving a state", () => {
    const fromVerification = nextTransitions(HABIT_MACHINE, "verification").map((t) => t.to);
    expect(fromVerification.sort()).toEqual(["correction", "overcome"]);
    expect(nextTransitions(HABIT_MACHINE, "overcome")).toEqual([]);
  });

  it("validates state membership", () => {
    expect(isValidState(HABIT_MACHINE, "analysis")).toBe(true);
    expect(isValidState(HABIT_MACHINE, "nope")).toBe(false);
  });
});

describe("parseMachine (jsonb round-trip)", () => {
  it("rebuilds a definition from stored columns", () => {
    const stored = toStoredMachine(HABIT_MACHINE);
    const def = parseMachine(stored.key, stored.states, stored.transitions);
    expect(def).not.toBeNull();
    expect(def!.initial).toBe("detected");
    expect(canTransition(def!, "verification", "correction")).toBe(true);
  });

  it("rejects a malformed states column", () => {
    expect(parseMachine("x", { initial: "a" }, [])).toBeNull();
    expect(parseMachine("x", null, [])).toBeNull();
  });

  it("rejects transitions that reference unknown states", () => {
    const states = { initial: "a", states: ["a", "b"] };
    const transitions = [{ from: "a", to: "z", event: "go" }];
    expect(parseMachine("x", states, transitions)).toBeNull();
  });

  it("rejects an initial state not in the state list", () => {
    expect(parseMachine("x", { initial: "z", states: ["a"] }, [])).toBeNull();
  });
});
