// Weighted FDD progress (RF4.3): each feature status carries a cumulative weight
// (0 at design, 1 at done); a goal's progress is the average feature weight.
// Pure logic — the server passes feature statuses and renders the percentage.

export type FeatureStatus = "design" | "design_reviewed" | "build" | "build_reviewed" | "done";

// Monotonic milestone weights, mirroring FDD's "design then build" split.
export const FEATURE_WEIGHTS: Record<FeatureStatus, number> = {
  design: 0.1,
  design_reviewed: 0.4,
  build: 0.7,
  build_reviewed: 0.9,
  done: 1,
};

export function featureWeight(status: FeatureStatus): number {
  return FEATURE_WEIGHTS[status];
}

// Fraction (0..1) of a goal completed, weighting each feature by its status.
export function weightedProgress(statuses: FeatureStatus[]): number {
  if (statuses.length === 0) return 0;
  const total = statuses.reduce((sum, s) => sum + FEATURE_WEIGHTS[s], 0);
  return total / statuses.length;
}

// Same, rounded to a whole percentage for display.
export function weightedProgressPercent(statuses: FeatureStatus[]): number {
  return Math.round(weightedProgress(statuses) * 100);
}

// Count of features that have reached the final state.
export function doneCount(statuses: FeatureStatus[]): number {
  return statuses.filter((s) => s === "done").length;
}
