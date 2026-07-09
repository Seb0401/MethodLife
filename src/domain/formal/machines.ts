// Canonical state machine definitions seeded into the state_machines table
// (roadmap 3.2). The seed inserts these and the engine reads them back at
// runtime, so this module is the single source of truth for both.
import type { StateMachineDef, Transition } from "./machine";

export const HABIT_MACHINE_KEY = "habit";
export const FEATURE_MACHINE_KEY = "feature";

// Habit lifecycle (RF5.2): detected → analysis → correction → verification →
// overcome, plus a relapse edge verification → correction that keeps history (RF5.6).
export const HABIT_MACHINE: StateMachineDef = {
  key: HABIT_MACHINE_KEY,
  initial: "detected",
  states: ["detected", "analysis", "correction", "verification", "overcome"],
  transitions: [
    { from: "detected", to: "analysis", event: "start_analysis" },
    { from: "analysis", to: "correction", event: "start_correction" },
    { from: "correction", to: "verification", event: "start_verification" },
    { from: "verification", to: "overcome", event: "verify_passed" },
    { from: "verification", to: "correction", event: "relapse" },
  ],
};

// FDD feature lifecycle (consumed in Fase 4). Seeded now so the engine is
// data-driven from the start and the feature flow is never hardcoded in the UI.
export const FEATURE_MACHINE: StateMachineDef = {
  key: FEATURE_MACHINE_KEY,
  initial: "design",
  states: ["design", "design_reviewed", "build", "build_reviewed", "done"],
  transitions: [
    { from: "design", to: "design_reviewed", event: "design_review" },
    { from: "design_reviewed", to: "build", event: "start_build" },
    { from: "build", to: "build_reviewed", event: "build_review" },
    { from: "build_reviewed", to: "done", event: "complete" },
  ],
};

export const SEED_MACHINES: StateMachineDef[] = [HABIT_MACHINE, FEATURE_MACHINE];

// Serializes a def to the two jsonb columns of a state_machines row.
export function toStoredMachine(def: StateMachineDef): {
  key: string;
  states: { initial: string; states: string[] };
  transitions: Transition[];
} {
  return {
    key: def.key,
    states: { initial: def.initial, states: [...def.states] },
    transitions: [...def.transitions],
  };
}
