// Data-driven state machine engine (RF6.5). One engine decides every lifecycle
// transition — habits (M5) and features (M4) — from definitions that live in the
// state_machines table. No flow is hardcoded per module; callers pass a parsed
// definition and this module is the single place that says "yes, that move is legal".
import { ok, err, type Result } from "../core/result";

export type Transition = { from: string; to: string; event: string };

export type StateMachineDef = {
  key: string;
  initial: string;
  states: readonly string[];
  transitions: readonly Transition[];
};

// Shape stored in state_machines.states (jsonb). Transitions are their own column.
export type StoredStates = { initial: string; states: string[] };

export const INVALID_TRANSITION = "INVALID_TRANSITION";

function isStoredStates(v: unknown): v is StoredStates {
  if (typeof v !== "object" || v === null) return false;
  const s = v as StoredStates;
  return (
    typeof s.initial === "string" &&
    Array.isArray(s.states) &&
    s.states.every((x) => typeof x === "string")
  );
}

function isTransitionArray(v: unknown): v is Transition[] {
  return (
    Array.isArray(v) &&
    v.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as Transition).from === "string" &&
        typeof (t as Transition).to === "string" &&
        typeof (t as Transition).event === "string",
    )
  );
}

// Rebuilds a definition from the two jsonb columns of a state_machines row.
// Returns null if malformed or if any transition references an unknown state, so
// a corrupt row can never drive an invalid flow.
export function parseMachine(
  key: string,
  states: unknown,
  transitions: unknown,
): StateMachineDef | null {
  if (!isStoredStates(states) || !isTransitionArray(transitions)) return null;
  const known = new Set(states.states);
  if (!known.has(states.initial)) return null;
  for (const t of transitions) {
    if (!known.has(t.from) || !known.has(t.to)) return null;
  }
  return { key, initial: states.initial, states: states.states, transitions };
}

export function isValidState(def: StateMachineDef, state: string): boolean {
  return def.states.includes(state);
}

// The transitions leaving a given state (drives which actions the UI offers).
export function nextTransitions(def: StateMachineDef, from: string): Transition[] {
  return def.transitions.filter((t) => t.from === from);
}

export function canTransition(def: StateMachineDef, from: string, to: string): boolean {
  return def.transitions.some((t) => t.from === from && t.to === to);
}

// Resolve the target state for an event fired from `from`, or null if the event
// is not legal there.
export function targetFor(def: StateMachineDef, from: string, event: string): string | null {
  const t = def.transitions.find((x) => x.from === from && x.event === event);
  return t ? t.to : null;
}

// Apply a named event: the single decision point for a valid transition.
export function applyEvent(def: StateMachineDef, from: string, event: string): Result<string> {
  const to = targetFor(def, from, event);
  if (!to) return err(INVALID_TRANSITION);
  return ok(to);
}
