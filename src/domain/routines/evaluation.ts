// Routine evaluation logic (RF8.3/8.6). Pure: the server groups daily
// evaluations and asks here for the consolidated result and the compliance rate.

export type EvaluationResult = "met" | "not_met";

// Consolidates several evaluators' results for one requirement on one day
// (RF8.6): "met" only when met-votes strictly outnumber not-met; ties resolve to
// "not_met" (conservative). Null when nobody evaluated that day.
export function consolidateResults(results: EvaluationResult[]): EvaluationResult | null {
  if (results.length === 0) return null;
  const met = results.filter((r) => r === "met").length;
  const notMet = results.length - met;
  return met > notMet ? "met" : "not_met";
}

// Fraction (0..1) of evaluated days a requirement was consolidated as met.
export function compliance(dayResults: (EvaluationResult | null)[]): number {
  const evaluated = dayResults.filter((r): r is EvaluationResult => r !== null);
  if (evaluated.length === 0) return 0;
  return evaluated.filter((r) => r === "met").length / evaluated.length;
}

export function compliancePercent(dayResults: (EvaluationResult | null)[]): number {
  return Math.round(compliance(dayResults) * 100);
}
