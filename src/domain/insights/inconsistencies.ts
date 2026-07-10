// Detects inconsistencies in the user's own model (RF11.3): a goal without an
// area, an invariant referencing data that no longer exists, or a routine with
// no requirements. Pure — the server gathers the raw findings.

export type InconsistencyInput = {
  goalsWithoutArea: number;
  // Invariants whose rule points at a missing area or column.
  brokenInvariants: { name: string }[];
  // Routines whose latest version has no requirements.
  routinesWithoutRequirements: { name: string }[];
};

export type Inconsistency =
  | { kind: "goal_no_area"; count: number }
  | { kind: "invariant_broken_ref"; name: string }
  | { kind: "routine_no_requirements"; name: string };

export function detectInconsistencies(input: InconsistencyInput): Inconsistency[] {
  const items: Inconsistency[] = [];

  if (input.goalsWithoutArea > 0) {
    items.push({ kind: "goal_no_area", count: input.goalsWithoutArea });
  }
  for (const inv of input.brokenInvariants) {
    items.push({ kind: "invariant_broken_ref", name: inv.name });
  }
  for (const r of input.routinesWithoutRequirements) {
    items.push({ kind: "routine_no_requirements", name: r.name });
  }

  return items;
}
